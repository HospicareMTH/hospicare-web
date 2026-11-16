import { Suspense } from "react";

import { DataTableSkeleton } from "@/components/shared/data-table/data-table-skeleton";
import {
  getHiddenColumns,
  requirePermission,
  saveHiddenColumnsAction,
} from "@/modules/access";
import type { SearchParams } from "@/platform/list-query";

import {
  ADMISSION_INTERVIEWS_TABLE_KEY,
  parseAdmissionInterviewListQuery,
} from "../schemas";
import { searchAdmissionInterviews } from "../service";
import { AdmissionInterviewsTable } from "./admission-interviews-table";

async function AdmissionInterviewsContent({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const { access } = await requirePermission("admissions.interviews.view");
  const query = parseAdmissionInterviewListQuery(await searchParams);
  const [interviewList, hiddenColumns] = await Promise.all([
    searchAdmissionInterviews(query),
    getHiddenColumns(access.userId, ADMISSION_INTERVIEWS_TABLE_KEY),
  ]);

  return (
    <AdmissionInterviewsTable
      interviewList={interviewList}
      query={query}
      hiddenColumns={hiddenColumns}
      saveHiddenColumnsAction={saveHiddenColumnsAction}
    />
  );
}

export function AdmissionInterviewsScreen({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  return (
    <Suspense fallback={<DataTableSkeleton label="Cargando entrevistas…" />}>
      <AdmissionInterviewsContent searchParams={searchParams} />
    </Suspense>
  );
}
