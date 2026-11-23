import { listSelectableCatalogOptions } from "@/modules/catalogs";
import { removeDniSeparators } from "@/platform/dni";
import {
  type ListPage,
  normalizeForSearch,
  resolvePageWindow,
} from "@/platform/list-query";

import {
  countGuestRecords,
  type GuestSearch,
  listGuestRecords,
  listUsedHealthInsuranceOptionIds,
} from "./repository";
import type { GuestListQuery } from "./schemas";
import type { GuestOrigin } from "./tables";

export type GuestListItem = {
  id: string;
  clinicalRecordNumber: number;
  fullName: string;
  dni: string;
  hospitalizationDate: string;
  healthInsuranceLabel: string | null;
  healthInsuranceMemberNumber: string | null;
  origin: GuestOrigin;
  createdAt: Date;
};

const DIGITS_ONLY_SEARCH = /^\d+$/;
const DNI_LIKE_SEARCH = /^[\d.\-\s]+$/;
const LARGEST_STORED_INTEGER = 2_147_483_647;

function toSearchTerm(search: string): string {
  return DNI_LIKE_SEARCH.test(search) ? removeDniSeparators(search) : search;
}

function toClinicalRecordNumber(search: string): number | null {
  if (!DIGITS_ONLY_SEARCH.test(search)) {
    return null;
  }
  const candidate = Number(search);
  return candidate <= LARGEST_STORED_INTEGER ? candidate : null;
}

function findMatchingOptionIds(
  options: readonly { id: string; label: string }[],
  search: string,
): string[] {
  const normalizedSearch = normalizeForSearch(search);
  return options
    .filter(({ label }) => normalizeForSearch(label).includes(normalizedSearch))
    .map(({ id }) => id);
}

export async function searchGuests(
  query: GuestListQuery,
): Promise<ListPage<GuestListItem>> {
  const healthInsuranceOptions = await listSelectableCatalogOptions(
    "health_insurance",
    await listUsedHealthInsuranceOptionIds(),
  );
  const search: GuestSearch = {
    ...query,
    searchTerm: toSearchTerm(query.search),
    clinicalRecordNumber: toClinicalRecordNumber(query.search),
    matchingHealthInsuranceOptionIds: query.search
      ? findMatchingOptionIds(healthInsuranceOptions, query.search)
      : [],
  };
  const totalCount = await countGuestRecords(search);
  const window = resolvePageWindow(totalCount, query.page, query.pageSize);
  const records = await listGuestRecords(search, {
    offset: window.offset,
    limit: query.pageSize,
  });
  const healthInsuranceLabels = new Map(
    healthInsuranceOptions.map(({ id, label }) => [id, label]),
  );

  return {
    items: records.map((record) => ({
      id: record.id,
      clinicalRecordNumber: record.clinicalRecordNumber,
      fullName: `${record.firstName} ${record.lastName}`,
      dni: record.dni,
      hospitalizationDate: record.hospitalizationDate,
      healthInsuranceLabel: record.healthInsuranceOptionId
        ? (healthInsuranceLabels.get(record.healthInsuranceOptionId) ?? null)
        : null,
      healthInsuranceMemberNumber: record.healthInsuranceMemberNumber,
      origin: record.origin,
      createdAt: record.createdAt,
    })),
    totalCount,
    page: window.page,
    pageCount: window.pageCount,
    pageSize: query.pageSize,
  };
}
