import {
  and,
  asc,
  count,
  desc,
  eq,
  isNotNull,
  isNull,
  type SQL,
  sql,
} from "drizzle-orm";

import {
  type DatabaseTransaction,
  getDatabase,
} from "@/platform/database/client";
import { normalizeTextSql } from "@/platform/database/text-normalization";

import type {
  AdmissionInterviewDetails,
  AdmissionInterviewListQuery,
  AdmissionInterviewSortKey,
} from "./schemas";
import { admissionInterviews, admissionInterviewSurgeries } from "./tables";

export async function insertAdmissionInterview(
  transaction: DatabaseTransaction,
  { surgeryOptionIds, ...details }: AdmissionInterviewDetails,
  actorUserId: string,
): Promise<string> {
  const [interview] = await transaction
    .insert(admissionInterviews)
    .values({
      ...details,
      createdByUserId: actorUserId,
      updatedByUserId: actorUserId,
    })
    .returning({ id: admissionInterviews.id });
  if (!interview) {
    throw new Error("La base no devolvió la entrevista creada.");
  }
  if (surgeryOptionIds.length > 0) {
    await transaction.insert(admissionInterviewSurgeries).values(
      surgeryOptionIds.map((surgeryOptionId) => ({
        admissionInterviewId: interview.id,
        surgeryOptionId,
      })),
    );
  }
  return interview.id;
}

export async function hasActiveInterviewWithDni(dni: string): Promise<boolean> {
  const [interview] = await getDatabase()
    .select({ id: admissionInterviews.id })
    .from(admissionInterviews)
    .where(
      and(
        eq(admissionInterviews.guestDni, dni),
        isNull(admissionInterviews.annulledAt),
      ),
    )
    .limit(1);
  return interview !== undefined;
}

export type AdmissionInterviewListRecord = {
  id: string;
  interviewDate: string;
  guestFirstName: string;
  guestLastName: string;
  guestDni: string;
  intervieweeFullName: string;
  intervieweeRelationshipOptionId: string | null;
  primaryDoctorId: string | null;
  referredBy: string | null;
  createdAt: Date;
};

const LIST_COLUMNS = {
  id: admissionInterviews.id,
  interviewDate: admissionInterviews.interviewDate,
  guestFirstName: admissionInterviews.guestFirstName,
  guestLastName: admissionInterviews.guestLastName,
  guestDni: admissionInterviews.guestDni,
  intervieweeFullName: admissionInterviews.intervieweeFullName,
  intervieweeRelationshipOptionId:
    admissionInterviews.intervieweeRelationshipOptionId,
  primaryDoctorId: admissionInterviews.primaryDoctorId,
  referredBy: admissionInterviews.referredBy,
  createdAt: admissionInterviews.createdAt,
};

const LIKE_SPECIAL_CHARACTERS = /[\\%_]/g;
const LIKE_ESCAPED_MATCH = "\\$&";

const SEARCHABLE_TEXT = normalizeTextSql(
  sql`concat_ws(' ', ${admissionInterviews.guestFirstName}, ${admissionInterviews.guestLastName}, ${admissionInterviews.guestDni}, ${admissionInterviews.intervieweeFullName})`,
);

const SORT_EXPRESSIONS: Record<AdmissionInterviewSortKey, SQL[]> = {
  interviewDate: [sql`${admissionInterviews.interviewDate}`],
  guestName: [
    normalizeTextSql(sql`${admissionInterviews.guestFirstName}`),
    normalizeTextSql(sql`${admissionInterviews.guestLastName}`),
  ],
  intervieweeName: [
    normalizeTextSql(sql`${admissionInterviews.intervieweeFullName}`),
  ],
  createdAt: [sql`${admissionInterviews.createdAt}`],
};

export type AdmissionInterviewSearch = Omit<
  AdmissionInterviewListQuery,
  "search"
> & { searchTerm: string };

function buildListFilter({
  searchTerm,
  relationshipOptionId,
  primaryDoctorId,
}: AdmissionInterviewSearch): SQL | undefined {
  const escapedTerm = searchTerm.replace(
    LIKE_SPECIAL_CHARACTERS,
    LIKE_ESCAPED_MATCH,
  );
  return and(
    isNull(admissionInterviews.annulledAt),
    searchTerm
      ? sql`${SEARCHABLE_TEXT} like ${normalizeTextSql(sql`${`%${escapedTerm}%`}`)}`
      : undefined,
    relationshipOptionId
      ? eq(
          admissionInterviews.intervieweeRelationshipOptionId,
          relationshipOptionId,
        )
      : undefined,
    primaryDoctorId
      ? eq(admissionInterviews.primaryDoctorId, primaryDoctorId)
      : undefined,
  );
}

export async function countAdmissionInterviewRecords(
  search: AdmissionInterviewSearch,
): Promise<number> {
  const [result] = await getDatabase()
    .select({ total: count() })
    .from(admissionInterviews)
    .where(buildListFilter(search));
  return result?.total ?? 0;
}

export function listAdmissionInterviewRecords(
  search: AdmissionInterviewSearch,
  { offset, limit }: { offset: number; limit: number },
): Promise<AdmissionInterviewListRecord[]> {
  const direction = search.sort.isDescending ? desc : asc;
  return getDatabase()
    .select(LIST_COLUMNS)
    .from(admissionInterviews)
    .where(buildListFilter(search))
    .orderBy(
      ...SORT_EXPRESSIONS[search.sort.key].map((expression) =>
        direction(expression),
      ),
      asc(admissionInterviews.id),
    )
    .offset(offset)
    .limit(limit);
}

export type UsedFilterIds = {
  relationshipOptionIds: string[];
  primaryDoctorIds: string[];
};

export async function listUsedFilterIds(): Promise<UsedFilterIds> {
  const database = getDatabase();
  const [relationshipRows, primaryDoctorRows] = await Promise.all([
    database
      .selectDistinct({
        id: admissionInterviews.intervieweeRelationshipOptionId,
      })
      .from(admissionInterviews)
      .where(
        and(
          isNull(admissionInterviews.annulledAt),
          isNotNull(admissionInterviews.intervieweeRelationshipOptionId),
        ),
      ),
    database
      .selectDistinct({ id: admissionInterviews.primaryDoctorId })
      .from(admissionInterviews)
      .where(
        and(
          isNull(admissionInterviews.annulledAt),
          isNotNull(admissionInterviews.primaryDoctorId),
        ),
      ),
  ]);
  return {
    relationshipOptionIds: relationshipRows.flatMap(({ id }) =>
      id ? [id] : [],
    ),
    primaryDoctorIds: primaryDoctorRows.flatMap(({ id }) => (id ? [id] : [])),
  };
}
