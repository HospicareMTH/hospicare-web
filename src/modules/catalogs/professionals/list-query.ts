import {
  type ListQuery,
  type ListSort,
  parseListQuery,
  readSearchParam,
  type SearchParams,
} from "@/platform/list-query";

import {
  CATALOG_OPTION_STATE_PARAMETER,
  type CatalogOptionState,
  DEFAULT_CATALOG_OPTION_STATE,
} from "../schemas";

export const HEALTHCARE_PROFESSIONALS_TABLE_KEY = "healthcare-professionals";

export const HEALTHCARE_PROFESSIONAL_SORT_KEYS = ["fullName"] as const;

export type HealthcareProfessionalSortKey =
  (typeof HEALTHCARE_PROFESSIONAL_SORT_KEYS)[number];

export const DEFAULT_HEALTHCARE_PROFESSIONAL_SORT: ListSort<HealthcareProfessionalSortKey> =
  { key: "fullName", isDescending: false };

export const HEALTHCARE_PROFESSIONAL_STATE_PARAMETERS: Record<
  Exclude<CatalogOptionState, "active">,
  string
> = {
  inactive: "inactivos",
  all: "todos",
};

export type HealthcareProfessionalListQuery =
  ListQuery<HealthcareProfessionalSortKey> & { state: CatalogOptionState };

function parseHealthcareProfessionalState(
  value: string | undefined,
): CatalogOptionState {
  if (value === HEALTHCARE_PROFESSIONAL_STATE_PARAMETERS.inactive) {
    return "inactive";
  }
  if (value === HEALTHCARE_PROFESSIONAL_STATE_PARAMETERS.all) {
    return "all";
  }
  return DEFAULT_CATALOG_OPTION_STATE;
}

export function parseHealthcareProfessionalListQuery(
  searchParams: SearchParams,
): HealthcareProfessionalListQuery {
  return {
    ...parseListQuery(
      searchParams,
      HEALTHCARE_PROFESSIONAL_SORT_KEYS,
      DEFAULT_HEALTHCARE_PROFESSIONAL_SORT,
    ),
    state: parseHealthcareProfessionalState(
      readSearchParam(searchParams, CATALOG_OPTION_STATE_PARAMETER),
    ),
  };
}
