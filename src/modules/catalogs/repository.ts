import { asc, eq } from "drizzle-orm";

import { getDatabase } from "@/platform/database/client";

import type { CatalogKey } from "./definitions";
import { catalogOptions } from "./tables";

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
