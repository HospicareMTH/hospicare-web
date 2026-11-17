import { AUDIT_OPERATIONS, type AuditOperation } from "@/modules/audit";
import {
  type ListQuery,
  type ListSort,
  parseListQuery,
  readSearchParam,
  type SearchParams,
} from "@/platform/list-query";

import { AUDIT_RESOURCES, type AuditResource } from "./labels";

export const OPERATION_FILTER_PARAMETER = "operacion";
export const RESOURCE_FILTER_PARAMETER = "recurso";

export const ACTIVITY_LOG_SORT_KEYS = ["occurredAt"] as const;

export type ActivityLogSortKey = (typeof ACTIVITY_LOG_SORT_KEYS)[number];

export const DEFAULT_ACTIVITY_LOG_SORT: ListSort<ActivityLogSortKey> = {
  key: "occurredAt",
  isDescending: true,
};

export type ActivityLogListQuery = ListQuery<ActivityLogSortKey> & {
  operation: AuditOperation | null;
  resource: AuditResource | null;
};

function findListedValue<Value extends string>(
  values: readonly Value[],
  candidate: string | undefined,
): Value | null {
  return values.find((value) => value === candidate) ?? null;
}

export function parseActivityLogListQuery(
  searchParams: SearchParams,
): ActivityLogListQuery {
  return {
    ...parseListQuery(
      searchParams,
      ACTIVITY_LOG_SORT_KEYS,
      DEFAULT_ACTIVITY_LOG_SORT,
    ),
    operation: findListedValue(
      AUDIT_OPERATIONS,
      readSearchParam(searchParams, OPERATION_FILTER_PARAMETER),
    ),
    resource: findListedValue(
      AUDIT_RESOURCES,
      readSearchParam(searchParams, RESOURCE_FILTER_PARAMETER),
    ),
  };
}
