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
  CATALOG_DEFINITIONS,
  type CatalogDefinition,
  catalogPermission,
  type CatalogKey,
} from "./definitions";
import {
  type CatalogOptionRecord,
  insertOrReactivateOption,
  listCatalogOptions,
  setOptionActive,
  updateOptionDetails,
} from "./repository";
import type {
  CatalogOptionDetails,
  CatalogOptionListQuery,
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

export function listVisibleCatalogs(access: UserAccess): CatalogDefinition[] {
  return CATALOG_DEFINITIONS.filter((definition) =>
    hasPermission(access, catalogPermission(definition, "view")),
  );
}

export function resolveVisibleCatalog(
  access: UserAccess,
  requestedSlug: string | undefined,
): CatalogDefinition | null {
  const visibleCatalogs = listVisibleCatalogs(access);
  if (requestedSlug === undefined) {
    return visibleCatalogs[0] ?? null;
  }
  const requestedCatalog = CATALOG_DEFINITIONS.find(
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
