import {
  type ListQuery,
  type ListSort,
  parseListQuery,
  readSearchParam,
  type SearchParams,
} from "@/platform/list-query";

export const CATALOGS_PATH = "/admin/catalogos";
export const CATALOG_PARAMETER = "catalogo";
export const CATALOG_OPTION_STATE_PARAMETER = "estado";

export const CATALOG_OPTIONS_TABLE_KEY = "catalog-options";

export const CATALOG_OPTION_SORT_KEYS = ["sortOrder", "label"] as const;

export type CatalogOptionSortKey = (typeof CATALOG_OPTION_SORT_KEYS)[number];

export const DEFAULT_CATALOG_OPTION_SORT: ListSort<CatalogOptionSortKey> = {
  key: "sortOrder",
  isDescending: false,
};

export const CATALOG_OPTION_STATES = ["active", "inactive", "all"] as const;

export type CatalogOptionState = (typeof CATALOG_OPTION_STATES)[number];

export const DEFAULT_CATALOG_OPTION_STATE: CatalogOptionState = "active";

export const CATALOG_OPTION_STATE_PARAMETERS: Record<
  Exclude<CatalogOptionState, typeof DEFAULT_CATALOG_OPTION_STATE>,
  string
> = {
  inactive: "inactivas",
  all: "todas",
};

export type CatalogOptionListQuery = ListQuery<CatalogOptionSortKey> & {
  state: CatalogOptionState;
};

export function buildCatalogHref(slug: string): string {
  return `${CATALOGS_PATH}?${new URLSearchParams({ [CATALOG_PARAMETER]: slug })}`;
}

function parseCatalogOptionState(
  value: string | undefined,
): CatalogOptionState {
  if (value === CATALOG_OPTION_STATE_PARAMETERS.inactive) {
    return "inactive";
  }
  if (value === CATALOG_OPTION_STATE_PARAMETERS.all) {
    return "all";
  }
  return DEFAULT_CATALOG_OPTION_STATE;
}

export function parseCatalogOptionListQuery(
  searchParams: SearchParams,
): CatalogOptionListQuery {
  return {
    ...parseListQuery(
      searchParams,
      CATALOG_OPTION_SORT_KEYS,
      DEFAULT_CATALOG_OPTION_SORT,
    ),
    state: parseCatalogOptionState(
      readSearchParam(searchParams, CATALOG_OPTION_STATE_PARAMETER),
    ),
  };
}
