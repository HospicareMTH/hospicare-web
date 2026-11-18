"use client";

import {
  DataTable,
  type DataTableColumn,
} from "@/components/shared/data-table/data-table";
import { FilterSelect } from "@/components/shared/data-table/filter-select";
import {
  type SaveHiddenColumnsAction,
  saveHiddenColumnsWith,
} from "@/components/shared/data-table/save-hidden-columns";
import { Badge } from "@/components/ui/badge";
import type { AuditStatus } from "@/modules/audit";
import { formatDateTime } from "@/platform/dates";
import { compareText, type ListPage } from "@/platform/list-query";

import { AUDIT_RESOURCES, OPERATION_LABELS, labelResource } from "../labels";
import {
  ACTIVITY_LOG_TABLE_KEY,
  type ActivityLogListQuery,
  type ActivityLogSortKey,
  AUDIT_OPERATIONS,
  DEFAULT_ACTIVITY_LOG_SORT,
  OPERATION_FILTER_PARAMETER,
  OPERATION_PARAMETERS,
  RESOURCE_FILTER_PARAMETER,
  RESOURCE_PARAMETERS,
} from "../schemas";
import type { ActivityLogEntry } from "../service";

const STATUS_BADGE_VARIANTS: Record<AuditStatus, "outline" | "destructive"> = {
  success: "outline",
  failure: "destructive",
};

const COLUMNS: DataTableColumn<ActivityLogEntry, ActivityLogSortKey>[] = [
  {
    id: "occurredAt",
    label: "Fecha",
    sortKey: "occurredAt",
    canHide: false,
    cellClassName: "tabular-nums",
    cell: (entry) => formatDateTime(entry.occurredAt),
  },
  {
    id: "action",
    label: "Acción",
    canHide: false,
    cellClassName: "font-medium whitespace-normal",
    cell: (entry) => entry.actionLabel,
  },
  {
    id: "actorName",
    label: "Responsable",
    className: "hidden @lg:table-cell",
    cell: (entry) => entry.actorName,
  },
  {
    id: "status",
    label: "Estado",
    cell: (entry) => (
      <Badge variant={STATUS_BADGE_VARIANTS[entry.status]}>
        {entry.statusLabel}
      </Badge>
    ),
  },
  {
    id: "operation",
    label: "Operación",
    className: "hidden @2xl:table-cell",
    cell: (entry) => entry.operationLabel,
  },
  {
    id: "resource",
    label: "Recurso",
    className: "hidden @3xl:table-cell",
    cell: (entry) => entry.resourceLabel,
  },
  {
    id: "targetUserName",
    label: "Usuario afectado",
    className: "hidden @3xl:table-cell",
    cell: (entry) => entry.targetUserName,
  },
  {
    id: "ipAddress",
    label: "IP",
    className: "hidden @3xl:table-cell",
    cellClassName: "tabular-nums",
    cell: (entry) => entry.ipAddress,
  },
  {
    id: "userAgent",
    label: "Navegador",
    className: "hidden @3xl:table-cell",
    cellClassName: "max-w-64 truncate text-muted-foreground",
    cell: (entry) => (
      <span title={entry.userAgent ?? undefined}>{entry.userAgent}</span>
    ),
  },
];

const OPERATION_OPTIONS = AUDIT_OPERATIONS.map((operation) => ({
  value: OPERATION_PARAMETERS[operation],
  label: OPERATION_LABELS[operation],
}));

const RESOURCE_OPTIONS = AUDIT_RESOURCES.map((resource) => ({
  value: RESOURCE_PARAMETERS[resource],
  label: labelResource(resource),
})).sort((first, second) => compareText(first.label, second.label));

function describeEntryCount(count: number): string {
  return count === 1 ? "1 entrada" : `${count} entradas`;
}

function hasSearchOrFilters(query: ActivityLogListQuery): boolean {
  return (
    query.search !== "" || query.operation !== null || query.resource !== null
  );
}

export function ActivityLogTable({
  activityLog,
  query,
  hiddenColumns,
  saveHiddenColumnsAction,
}: {
  activityLog: ListPage<ActivityLogEntry>;
  query: ActivityLogListQuery;
  hiddenColumns: string[];
  saveHiddenColumnsAction: SaveHiddenColumnsAction;
}) {
  return (
    <DataTable
      columns={COLUMNS}
      page={activityLog}
      query={query}
      defaultSort={DEFAULT_ACTIVITY_LOG_SORT}
      searchLabel="Buscar acción o persona"
      emptyMessage={
        hasSearchOrFilters(query)
          ? "Ninguna entrada coincide con la búsqueda o los filtros."
          : "Todavía no hay actividad registrada."
      }
      totalLabel={describeEntryCount(activityLog.totalCount)}
      paginationLabel="Páginas del registro de actividad"
      getRowActions={() => []}
      getActionsLabel={(entry) =>
        `Acciones de la entrada del ${formatDateTime(entry.occurredAt)}`
      }
      hiddenColumns={hiddenColumns}
      onHiddenColumnsChange={(columns) =>
        saveHiddenColumnsWith(
          saveHiddenColumnsAction,
          ACTIVITY_LOG_TABLE_KEY,
          columns,
        )
      }
      filters={
        <>
          <FilterSelect
            label="Filtrar por operación"
            allLabel="Todas las operaciones"
            parameter={OPERATION_FILTER_PARAMETER}
            value={
              query.operation ? OPERATION_PARAMETERS[query.operation] : null
            }
            options={OPERATION_OPTIONS}
          />
          <FilterSelect
            label="Filtrar por recurso"
            allLabel="Todos los recursos"
            parameter={RESOURCE_FILTER_PARAMETER}
            value={query.resource ? RESOURCE_PARAMETERS[query.resource] : null}
            options={RESOURCE_OPTIONS}
          />
        </>
      }
    />
  );
}
