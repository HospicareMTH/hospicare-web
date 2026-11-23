import { Suspense } from "react";

import { DataTableSkeleton } from "@/components/shared/data-table/data-table-skeleton";
import {
  getHiddenColumns,
  requirePermission,
  saveHiddenColumnsAction,
} from "@/modules/access";
import type { SearchParams } from "@/platform/list-query";

import { GUESTS_TABLE_KEY, parseGuestListQuery } from "../schemas";
import { searchGuests } from "../service";
import { GuestsTable } from "./guests-table";

async function GuestsContent({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const { access } = await requirePermission("guests.records.view");
  const query = parseGuestListQuery(await searchParams);
  const [page, hiddenColumns] = await Promise.all([
    searchGuests(query),
    getHiddenColumns(access.userId, GUESTS_TABLE_KEY),
  ]);

  return (
    <GuestsTable
      page={page}
      query={query}
      hiddenColumns={hiddenColumns}
      saveHiddenColumnsAction={saveHiddenColumnsAction}
    />
  );
}

export function GuestsScreen({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  return (
    <Suspense fallback={<DataTableSkeleton label="Cargando huéspedes…" />}>
      <GuestsContent searchParams={searchParams} />
    </Suspense>
  );
}
