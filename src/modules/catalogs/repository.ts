import { and, asc, eq, sql } from "drizzle-orm";

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

export async function findCatalogOfOption(
  optionId: string,
): Promise<CatalogKey | null> {
  const [option] = await getDatabase()
    .select({ catalog: catalogOptions.catalog })
    .from(catalogOptions)
    .where(eq(catalogOptions.id, optionId));
  return option?.catalog ?? null;
}

export type OptionInsertOutcome = "created" | "reactivated" | "duplicate";

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
    .returning({ wasInserted: sql<boolean>`(xmax = 0)` });
  if (!row) {
    return "duplicate";
  }
  return row.wasInserted ? "created" : "reactivated";
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
