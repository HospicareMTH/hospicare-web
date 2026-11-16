import {
  listSelectableCatalogOptions,
  listSelectableHealthcareProfessionals,
  type SelectableCatalogEntry,
} from "@/modules/catalogs";
import { removeDniSeparators } from "@/platform/dni";
import { type ListPage, resolvePageWindow } from "@/platform/list-query";

import {
  countAdmissionInterviewRecords,
  listAdmissionInterviewRecords,
  listUsedFilterIds,
} from "./repository";
import type { AdmissionInterviewListQuery } from "./schemas";

export type AdmissionInterviewListItem = {
  id: string;
  interviewDate: string;
  guestFullName: string;
  guestDni: string;
  intervieweeFullName: string;
  relationshipLabel: string | null;
  primaryDoctorName: string | null;
  referredBy: string | null;
  createdAt: Date;
};

export type FilterOption = {
  value: string;
  label: string;
};

export type AdmissionInterviewList = {
  page: ListPage<AdmissionInterviewListItem>;
  relationshipOptions: FilterOption[];
  primaryDoctorOptions: FilterOption[];
};

const DNI_LIKE_SEARCH = /^[\d.\-\s]+$/;

function toSearchTerm(search: string): string {
  return DNI_LIKE_SEARCH.test(search) ? removeDniSeparators(search) : search;
}

function toFilterOptions(entries: SelectableCatalogEntry[]): FilterOption[] {
  return entries.map(({ id, label }) => ({ value: id, label }));
}

function labelOf(
  labelsById: ReadonlyMap<string, string>,
  entryId: string | null,
): string | null {
  return entryId ? (labelsById.get(entryId) ?? null) : null;
}

export async function searchAdmissionInterviews(
  query: AdmissionInterviewListQuery,
): Promise<AdmissionInterviewList> {
  const search = { ...query, searchTerm: toSearchTerm(query.search) };
  const [totalCount, usedFilterIds] = await Promise.all([
    countAdmissionInterviewRecords(search),
    listUsedFilterIds(),
  ]);
  const window = resolvePageWindow(totalCount, query.page, query.pageSize);
  const [records, relationshipEntries, primaryDoctorEntries] =
    await Promise.all([
      listAdmissionInterviewRecords(search, {
        offset: window.offset,
        limit: query.pageSize,
      }),
      listSelectableCatalogOptions(
        "relationship",
        usedFilterIds.relationshipOptionIds,
      ),
      listSelectableHealthcareProfessionals(usedFilterIds.primaryDoctorIds),
    ]);
  const relationshipLabels = new Map(
    relationshipEntries.map(({ id, label }) => [id, label]),
  );
  const primaryDoctorNames = new Map(
    primaryDoctorEntries.map(({ id, label }) => [id, label]),
  );

  return {
    page: {
      items: records.map((record) => ({
        id: record.id,
        interviewDate: record.interviewDate,
        guestFullName: `${record.guestFirstName} ${record.guestLastName}`,
        guestDni: record.guestDni,
        intervieweeFullName: record.intervieweeFullName,
        relationshipLabel: labelOf(
          relationshipLabels,
          record.intervieweeRelationshipOptionId,
        ),
        primaryDoctorName: labelOf(primaryDoctorNames, record.primaryDoctorId),
        referredBy: record.referredBy,
        createdAt: record.createdAt,
      })),
      totalCount,
      page: window.page,
      pageCount: window.pageCount,
      pageSize: query.pageSize,
    },
    relationshipOptions: toFilterOptions(relationshipEntries),
    primaryDoctorOptions: toFilterOptions(primaryDoctorEntries),
  };
}
