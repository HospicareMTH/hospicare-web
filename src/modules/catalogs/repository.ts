import { and, asc, count, eq, inArray, or, sql } from "drizzle-orm";

import {
  type DatabaseTransaction,
  getDatabase,
} from "@/platform/database/client";

import type { CatalogKey } from "./definitions";
import type { CatalogOptionDetails } from "./schemas";
import { catalogOptions } from "./tables";

const SORT_ORDER_STEP = 10;

export type CatalogOptionRecord = {
  id: string;
  label: string;
  description: string | null;
  isActive: boolean;
  isSystem: boolean;
  sortOrder: number;
};

export function listCatalogOptions(
  catalog: CatalogKey,
): Promise<CatalogOptionRecord[]> {
  return getDatabase()
    .select({
      id: catalogOptions.id,
      label: catalogOptions.label,
      description: catalogOptions.description,
      isActive: catalogOptions.isActive,
      isSystem: catalogOptions.isSystem,
      sortOrder: catalogOptions.sortOrder,
    })
    .from(catalogOptions)
    .where(eq(catalogOptions.catalog, catalog))
    .orderBy(asc(catalogOptions.sortOrder), asc(catalogOptions.label));
}

export async function findOptionIdBySystemKey(
  catalog: CatalogKey,
  systemKey: string,
): Promise<string | null> {
  const [option] = await getDatabase()
    .select({ id: catalogOptions.id })
    .from(catalogOptions)
    .where(
      and(
        eq(catalogOptions.catalog, catalog),
        eq(catalogOptions.systemKey, systemKey),
      ),
    );
  return option?.id ?? null;
}

export async function findCatalogOfOption(
  optionId: string,
): Promise<CatalogKey | null> {
  const [option] = await getDatabase()
    .select({ catalog: catalogOptions.catalog })
    .from(catalogOptions)
    .where(eq(catalogOptions.id, optionId));
  return option?.catalog ?? null;
}

export type OptionInsertOutcome =
  { kind: "created" | "reactivated"; optionId: string } | { kind: "duplicate" };

export async function insertOrReactivateOption(
  transaction: DatabaseTransaction,
  catalog: CatalogKey,
  { label, description }: CatalogOptionDetails,
  actorUserId: string,
): Promise<OptionInsertOutcome> {
  const [row] = await transaction
    .insert(catalogOptions)
    .values({
      catalog,
      label,
      description,
      sortOrder: sql`(select coalesce(max(${catalogOptions.sortOrder}), 0) + ${SORT_ORDER_STEP} from ${catalogOptions} where ${catalogOptions.catalog} = ${catalog})`,
      createdByUserId: actorUserId,
      updatedByUserId: actorUserId,
    })
    .onConflictDoUpdate({
      target: [catalogOptions.catalog, catalogOptions.normalizedLabel],
      set: {
        isActive: true,
        updatedByUserId: actorUserId,
        updatedAt: sql`now()`,
      },
      setWhere: eq(catalogOptions.isActive, false),
    })
    // xmax = 0 solo en filas recién insertadas: distingue alta de reactivación.
    .returning({
      optionId: catalogOptions.id,
      wasInserted: sql<boolean>`(xmax = 0)`,
    });
  if (!row) {
    return { kind: "duplicate" };
  }
  return {
    kind: row.wasInserted ? "created" : "reactivated",
    optionId: row.optionId,
  };
}

export type SelectableOptionRecord = {
  id: string;
  label: string;
  isActive: boolean;
};

const SELECTABLE_OPTION_COLUMNS = {
  id: catalogOptions.id,
  label: catalogOptions.label,
  isActive: catalogOptions.isActive,
};

export function listSelectableOptionRecords(
  catalog: CatalogKey,
  savedOptionIds: readonly string[],
): Promise<SelectableOptionRecord[]> {
  const isSelectable =
    savedOptionIds.length === 0
      ? eq(catalogOptions.isActive, true)
      : or(
          eq(catalogOptions.isActive, true),
          inArray(catalogOptions.id, [...savedOptionIds]),
        );
  return getDatabase()
    .select(SELECTABLE_OPTION_COLUMNS)
    .from(catalogOptions)
    .where(and(eq(catalogOptions.catalog, catalog), isSelectable))
    .orderBy(asc(catalogOptions.sortOrder), asc(catalogOptions.label));
}

export function findCatalogOptionsByIds(
  transaction: DatabaseTransaction,
  catalog: CatalogKey,
  optionIds: readonly string[],
): Promise<SelectableOptionRecord[]> {
  return transaction
    .select(SELECTABLE_OPTION_COLUMNS)
    .from(catalogOptions)
    .where(
      and(
        eq(catalogOptions.catalog, catalog),
        inArray(catalogOptions.id, [...optionIds]),
      ),
    );
}

export async function updateOptionDetails(
  transaction: DatabaseTransaction,
  optionId: string,
  { label, description }: CatalogOptionDetails,
  actorUserId: string,
): Promise<boolean> {
  const updatedRows = await transaction
    .update(catalogOptions)
    .set({
      label,
      description,
      updatedByUserId: actorUserId,
      updatedAt: sql`now()`,
    })
    .where(eq(catalogOptions.id, optionId))
    .returning({ id: catalogOptions.id });
  return updatedRows.length > 0;
}

export type CatalogOrderEntry = {
  id: string;
  isActive: boolean;
  sortOrder: number;
};

export function lockCatalogOrder(
  transaction: DatabaseTransaction,
  catalog: CatalogKey,
): Promise<CatalogOrderEntry[]> {
  return transaction
    .select({
      id: catalogOptions.id,
      isActive: catalogOptions.isActive,
      sortOrder: catalogOptions.sortOrder,
    })
    .from(catalogOptions)
    .where(eq(catalogOptions.catalog, catalog))
    .orderBy(asc(catalogOptions.sortOrder), asc(catalogOptions.label))
    .for("update");
}

export async function saveCatalogOrder(
  transaction: DatabaseTransaction,
  orderedEntries: CatalogOrderEntry[],
  actorUserId: string,
): Promise<void> {
  for (const [index, entry] of orderedEntries.entries()) {
    const sortOrder = (index + 1) * SORT_ORDER_STEP;
    if (entry.sortOrder === sortOrder) {
      continue;
    }
    await transaction
      .update(catalogOptions)
      .set({ sortOrder, updatedByUserId: actorUserId, updatedAt: sql`now()` })
      .where(eq(catalogOptions.id, entry.id));
  }
}

export async function setOptionActive(
  transaction: DatabaseTransaction,
  optionId: string,
  isActive: boolean,
  actorUserId: string,
): Promise<boolean> {
  const [option] = await transaction
    .select({ isActive: catalogOptions.isActive })
    .from(catalogOptions)
    .where(eq(catalogOptions.id, optionId))
    .for("update");
  if (!option) {
    return false;
  }
  await transaction
    .update(catalogOptions)
    .set({ isActive, updatedByUserId: actorUserId, updatedAt: sql`now()` })
    .where(
      and(
        eq(catalogOptions.id, optionId),
        eq(catalogOptions.isActive, !isActive),
      ),
    );
  return true;
}

export function countActiveOptionsByCatalog(): Promise<
  { catalog: CatalogKey; activeCount: number }[]
> {
  return getDatabase()
    .select({ catalog: catalogOptions.catalog, activeCount: count() })
    .from(catalogOptions)
    .where(eq(catalogOptions.isActive, true))
    .groupBy(catalogOptions.catalog);
}
