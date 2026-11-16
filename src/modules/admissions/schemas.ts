import { z } from "zod";

import {
  type ListQuery,
  type ListSort,
  parseListQuery,
  readSearchParam,
  type SearchParams,
} from "@/platform/list-query";

export const ADMISSION_INTERVIEWS_TABLE_KEY = "admission-interviews";

export const RELATIONSHIP_FILTER_PARAMETER = "vinculo";
export const PRIMARY_DOCTOR_FILTER_PARAMETER = "medico";

export const ADMISSION_INTERVIEW_SORT_KEYS = [
  "interviewDate",
  "guestName",
  "intervieweeName",
  "createdAt",
] as const;

export type AdmissionInterviewSortKey =
  (typeof ADMISSION_INTERVIEW_SORT_KEYS)[number];

export const DEFAULT_ADMISSION_INTERVIEW_SORT: ListSort<AdmissionInterviewSortKey> =
  { key: "interviewDate", isDescending: true };

export type AdmissionInterviewListQuery =
  ListQuery<AdmissionInterviewSortKey> & {
    relationshipOptionId: string | null;
    primaryDoctorId: string | null;
  };

const filterIdSchema = z.uuid();

function parseFilterId(value: string | undefined): string | null {
  const result = filterIdSchema.safeParse(value);
  return result.success ? result.data : null;
}

export function parseAdmissionInterviewListQuery(
  searchParams: SearchParams,
): AdmissionInterviewListQuery {
  return {
    ...parseListQuery(
      searchParams,
      ADMISSION_INTERVIEW_SORT_KEYS,
      DEFAULT_ADMISSION_INTERVIEW_SORT,
    ),
    relationshipOptionId: parseFilterId(
      readSearchParam(searchParams, RELATIONSHIP_FILTER_PARAMETER),
    ),
    primaryDoctorId: parseFilterId(
      readSearchParam(searchParams, PRIMARY_DOCTOR_FILTER_PARAMETER),
    ),
  };
}
