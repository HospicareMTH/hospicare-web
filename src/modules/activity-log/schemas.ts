import type { AuditOperation } from "@/modules/audit";
import {
  type ListQuery,
  type ListSort,
  parseListQuery,
  readSearchParam,
  type SearchParams,
} from "@/platform/list-query";

import { AUDIT_RESOURCES, type AuditResource } from "./labels";

export const ACTIVITY_LOG_TABLE_KEY = "activity-log";

export const DEFAULT_HIDDEN_ACTIVITY_LOG_COLUMNS = [
  "targetUserName",
  "ipAddress",
  "userAgent",
] as const;

export const OPERATION_FILTER_PARAMETER = "operacion";
export const RESOURCE_FILTER_PARAMETER = "recurso";

export const OPERATION_PARAMETERS: Record<AuditOperation, string> = {
  create: "alta",
  update: "actualizacion",
  delete: "baja",
  access: "acceso",
  session: "sesion",
  security: "seguridad",
};

function isAuditOperation(candidate: string): candidate is AuditOperation {
  return Object.hasOwn(OPERATION_PARAMETERS, candidate);
}

export const AUDIT_OPERATIONS: readonly AuditOperation[] =
  Object.keys(OPERATION_PARAMETERS).filter(isAuditOperation);

export const RESOURCE_PARAMETERS: Record<AuditResource, string> = {
  session: "sesion",
  user: "usuario",
  account: "datos-de-ingreso",
  two_factor: "segundo-factor",
  role: "rol",
  user_role: "rol-de-usuario",
  role_permission: "permisos-de-rol",
  invitation: "invitacion",
  table_column_preference: "columnas-de-listados",
  catalog_option: "opcion-de-catalogo",
  healthcare_professional: "profesional-de-salud",
  admission_interview: "entrevista-de-admision",
  admission_interview_surgery: "cirugia-de-entrevista",
};

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

function findByParameter<Value extends string>(
  values: readonly Value[],
  parameters: Record<Value, string>,
  candidate: string | undefined,
): Value | null {
  return values.find((value) => parameters[value] === candidate) ?? null;
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
    operation: findByParameter(
      AUDIT_OPERATIONS,
      OPERATION_PARAMETERS,
      readSearchParam(searchParams, OPERATION_FILTER_PARAMETER),
    ),
    resource: findByParameter(
      AUDIT_RESOURCES,
      RESOURCE_PARAMETERS,
      readSearchParam(searchParams, RESOURCE_FILTER_PARAMETER),
    ),
  };
}
