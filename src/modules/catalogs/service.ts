import { hasPermission, type UserAccess } from "@/modules/access";
import { runInTransactionAs } from "@/platform/database/client";
import { isUniqueViolation } from "@/platform/database/errors";
import {
  type Comparator,
  compareText,
  type ListPage,
  paginateList,
} from "@/platform/list-query";
import {
  type ActionResult,
  type FailedActionResult,
  type OperationResult,
  reject,
  SUCCESS,
} from "@/platform/operation-result";

import {
  CATALOG_ENTRIES,
  type CatalogEntry,
  catalogPermission,
  type CatalogKey,
  findCatalogByKey,
} from "./definitions";
import {
  type CatalogOptionRecord,
  type CatalogOrderEntry,
  insertOrReactivateOption,
  listCatalogOptions,
  lockCatalogOrder,
  saveCatalogOrder,
  setOptionActive,
  updateOptionDetails,
} from "./repository";
import type {
  CatalogOptionDetails,
  CatalogOptionListQuery,
  CatalogOptionMove,
  CatalogOptionSortKey,
  CatalogOptionState,
} from "./schemas";

export type CatalogOptionListItem = CatalogOptionRecord & {
  position: number;
};

const CATALOG_OPTION_COMPARATORS: Record<
  CatalogOptionSortKey,
  Comparator<CatalogOptionListItem>
> = {
  sortOrder: (first, second) => first.position - second.position,
  label: (first, second) => compareText(first.label, second.label),
};

export function listVisibleCatalogs(access: UserAccess): CatalogEntry[] {
  return CATALOG_ENTRIES.filter((definition) =>
    hasPermission(access, catalogPermission(definition, "view")),
  );
}

export function resolveVisibleCatalog(
  access: UserAccess,
  requestedSlug: string | undefined,
): CatalogEntry | null {
  const visibleCatalogs = listVisibleCatalogs(access);
  if (requestedSlug === undefined) {
    return visibleCatalogs[0] ?? null;
  }
  const requestedCatalog = CATALOG_ENTRIES.find(
    (definition) => definition.slug === requestedSlug,
  );
  if (!requestedCatalog) {
    return visibleCatalogs[0] ?? null;
  }
  return visibleCatalogs.includes(requestedCatalog) ? requestedCatalog : null;
}

function matchesState(
  option: CatalogOptionRecord,
  state: CatalogOptionState,
): boolean {
  if (state === "all") {
    return true;
  }
  return option.isActive === (state === "active");
}

export async function searchCatalogOptions(
  catalog: CatalogKey,
  { state, ...query }: CatalogOptionListQuery,
): Promise<ListPage<CatalogOptionListItem>> {
  const options = (await listCatalogOptions(catalog))
    .map((option, index) => ({ ...option, position: index + 1 }))
    .filter((option) => matchesState(option, state));
  return paginateList(
    options,
    query,
    (option) => `${option.label} ${option.description ?? ""}`,
    CATALOG_OPTION_COMPARATORS,
  );
}

export const CATALOG_REJECTION_MESSAGES = {
  optionMissing: "La opción ya no existe. Actualizá la pantalla.",
  alreadyFirst: "La opción ya está en el primer lugar.",
  alreadyLast: "La opción ya está en el último lugar.",
  invalidMoveTarget:
    "Solo se puede mover entre opciones activas del mismo catálogo.",
} as const;

function rejectDuplicateLabel(label: string): FailedActionResult {
  return {
    status: "invalid",
    fieldErrors: { label: [`Ya existe «${label}» en este catálogo.`] },
  };
}

export type CreateCatalogOptionResult =
  FailedActionResult | { status: "success"; wasReactivated: boolean };

export async function createCatalogOption(
  actorUserId: string,
  catalog: CatalogKey,
  details: CatalogOptionDetails,
): Promise<CreateCatalogOptionResult> {
  const outcome = await runInTransactionAs(actorUserId, (transaction) =>
    insertOrReactivateOption(transaction, catalog, details, actorUserId),
  );
  if (outcome === "duplicate") {
    return rejectDuplicateLabel(details.label);
  }
  return { status: "success", wasReactivated: outcome === "reactivated" };
}

export async function updateCatalogOption(
  actorUserId: string,
  optionId: string,
  details: CatalogOptionDetails,
): Promise<ActionResult> {
  try {
    const wasUpdated = await runInTransactionAs(actorUserId, (transaction) =>
      updateOptionDetails(transaction, optionId, details, actorUserId),
    );
    return wasUpdated
      ? SUCCESS
      : reject(CATALOG_REJECTION_MESSAGES.optionMissing);
  } catch (error) {
    if (isUniqueViolation(error)) {
      return rejectDuplicateLabel(details.label);
    }
    throw error;
  }
}

export async function setCatalogOptionActive(
  actorUserId: string,
  optionId: string,
  isActive: boolean,
): Promise<OperationResult> {
  const optionExists = await runInTransactionAs(actorUserId, (transaction) =>
    setOptionActive(transaction, optionId, isActive, actorUserId),
  );
  return optionExists
    ? SUCCESS
    : reject(CATALOG_REJECTION_MESSAGES.optionMissing);
}

function resolveMoveTarget(
  activeIds: string[],
  optionId: string,
  move: CatalogOptionMove,
): string | OperationResult {
  if ("targetOptionId" in move) {
    return activeIds.includes(move.targetOptionId)
      ? move.targetOptionId
      : reject(CATALOG_REJECTION_MESSAGES.invalidMoveTarget);
  }
  const optionIndex = activeIds.indexOf(optionId);
  if (move.direction === "up") {
    return (
      activeIds[optionIndex - 1] ??
      reject(CATALOG_REJECTION_MESSAGES.alreadyFirst)
    );
  }
  return (
    activeIds[optionIndex + 1] ?? reject(CATALOG_REJECTION_MESSAGES.alreadyLast)
  );
}

function placeOptionAtTarget(
  entries: CatalogOrderEntry[],
  optionId: string,
  targetId: string,
): CatalogOrderEntry[] {
  const optionIndex = entries.findIndex((entry) => entry.id === optionId);
  const targetIndex = entries.findIndex((entry) => entry.id === targetId);
  const option = entries[optionIndex];
  if (!option || optionIndex === targetIndex) {
    return entries;
  }
  const remaining = entries.filter((entry) => entry.id !== optionId);
  const targetIndexInRemaining = remaining.findIndex(
    (entry) => entry.id === targetId,
  );
  const isMovingDown = optionIndex < targetIndex;
  const insertionIndex = isMovingDown
    ? targetIndexInRemaining + 1
    : targetIndexInRemaining;
  return remaining.toSpliced(insertionIndex, 0, option);
}

export async function moveCatalogOption(
  actorUserId: string,
  catalog: CatalogKey,
  optionId: string,
  move: CatalogOptionMove,
): Promise<OperationResult> {
  const definition = findCatalogByKey(catalog);
  if (!definition.isReorderable) {
    return reject(
      `${definition.label} tiene un orden fijo: las opciones nuevas van al final.`,
    );
  }
  return runInTransactionAs(actorUserId, async (transaction) => {
    const entries = await lockCatalogOrder(transaction, catalog);
    const activeIds = entries
      .filter((entry) => entry.isActive)
      .map((entry) => entry.id);
    if (!activeIds.includes(optionId)) {
      return reject(CATALOG_REJECTION_MESSAGES.invalidMoveTarget);
    }
    const target = resolveMoveTarget(activeIds, optionId, move);
    if (typeof target !== "string") {
      return target;
    }
    await saveCatalogOrder(
      transaction,
      placeOptionAtTarget(entries, optionId, target),
      actorUserId,
    );
    return SUCCESS;
  });
}
