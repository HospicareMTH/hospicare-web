import { forbidden } from "next/navigation";
import { Suspense } from "react";

import { DataTableSkeleton } from "@/components/shared/data-table/data-table-skeleton";
import {
  getHiddenColumns,
  requirePermission,
  saveHiddenColumnsAction,
} from "@/modules/access";
import type { SearchParams } from "@/platform/list-query";

import {
  ACTIVITY_LOG_TABLE_KEY,
  DEFAULT_HIDDEN_ACTIVITY_LOG_COLUMNS,
  parseActivityLogListQuery,
} from "../schemas";
import { searchActivityLog } from "../service";
import { ActivityLogTable } from "./activity-log-table";

async function ActivityLogContent({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const { access } = await requirePermission("admin.logs.view");
  const query = parseActivityLogListQuery(await searchParams);
  const [activityLog, hiddenColumns] = await Promise.all([
    searchActivityLog(access, query),
    getHiddenColumns(
      access.userId,
      ACTIVITY_LOG_TABLE_KEY,
      DEFAULT_HIDDEN_ACTIVITY_LOG_COLUMNS,
    ),
  ]);
  if (!activityLog) {
    forbidden();
  }

  return (
    <ActivityLogTable
      activityLog={activityLog}
      query={query}
      hiddenColumns={hiddenColumns}
      saveHiddenColumnsAction={saveHiddenColumnsAction}
    />
  );
}

export function ActivityLogScreen({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  return (
    <Suspense fallback={<DataTableSkeleton label="Cargando actividad…" />}>
      <ActivityLogContent searchParams={searchParams} />
    </Suspense>
  );
}
