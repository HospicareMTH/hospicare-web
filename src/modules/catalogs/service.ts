import { hasPermission, type UserAccess } from "@/modules/access";
import {
  type Comparator,
  compareText,
  type ListPage,
  paginateList,
} from "@/platform/list-query";

import {
  CATALOG_DEFINITIONS,
  type CatalogDefinition,
  type CatalogKey,
} from "./definitions";
import { type CatalogOptionRecord, listCatalogOptions } from "./repository";
import type {
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
    hasPermission(access, definition.viewPermission),
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
