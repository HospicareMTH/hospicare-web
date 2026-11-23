import {
  type ListQuery,
  type ListSort,
  parseListQuery,
  readSearchParam,
  type SearchParams,
} from "@/platform/list-query";

import type { GuestOrigin } from "./tables";

export const GUESTS_PATH = "/huespedes";

export const GUESTS_TABLE_KEY = "guests";

export const ORIGIN_FILTER_PARAMETER = "origen";

export const GUEST_ORIGIN_LABELS: Record<GuestOrigin, string> = {
  admission: "Admisión",
  manual: "Sin entrevista",
};

const ORIGIN_FILTER_VALUES = [
  { origin: "admission", value: "admision" },
  { origin: "manual", value: "sin-entrevista" },
] as const satisfies readonly { origin: GuestOrigin; value: string }[];

export const ORIGIN_FILTER_OPTIONS = ORIGIN_FILTER_VALUES.map(
  ({ origin, value }) => ({ value, label: GUEST_ORIGIN_LABELS[origin] }),
);

export const GUEST_SORT_KEYS = [
  "hospitalizationDate",
  "guestName",
  "dni",
  "createdAt",
] as const;

export type GuestSortKey = (typeof GUEST_SORT_KEYS)[number];

export const DEFAULT_GUEST_SORT: ListSort<GuestSortKey> = {
  key: "hospitalizationDate",
  isDescending: true,
};

export type GuestListQuery = ListQuery<GuestSortKey> & {
  origin: GuestOrigin | null;
};

function parseOriginFilter(value: string | undefined): GuestOrigin | null {
  return (
    ORIGIN_FILTER_VALUES.find((filter) => filter.value === value)?.origin ??
    null
  );
}

export function toOriginFilterValue(origin: GuestOrigin | null): string | null {
  return (
    ORIGIN_FILTER_VALUES.find((filter) => filter.origin === origin)?.value ??
    null
  );
}

export function parseGuestListQuery(
  searchParams: SearchParams,
): GuestListQuery {
  return {
    ...parseListQuery(searchParams, GUEST_SORT_KEYS, DEFAULT_GUEST_SORT),
    origin: parseOriginFilter(
      readSearchParam(searchParams, ORIGIN_FILTER_PARAMETER),
    ),
  };
}
