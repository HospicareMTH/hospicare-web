import {
  and,
  asc,
  count,
  desc,
  eq,
  inArray,
  isNotNull,
  isNull,
  ne,
  type SQL,
  sql,
} from "drizzle-orm";

import {
  type DatabaseTransaction,
  getDatabase,
} from "@/platform/database/client";
import {
  containsNormalizedTextSql,
  normalizeTextSql,
} from "@/platform/database/text-normalization";

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

export async function hasActiveInterviewWithDni(
  dni: string,
  excludedInterviewId: string | null,
): Promise<boolean> {
  const [interview] = await getDatabase()
    .select({ id: admissionInterviews.id })
    .from(admissionInterviews)
    .where(
      and(
        eq(admissionInterviews.guestDni, dni),
        isNull(admissionInterviews.annulledAt),
        excludedInterviewId
          ? ne(admissionInterviews.id, excludedInterviewId)
          : undefined,
      ),
    )
    .limit(1);
  return interview !== undefined;
}

export async function listActiveInterviewIdsWithDni(
  dni: string,
): Promise<string[]> {
  const interviews = await getDatabase()
    .select({ id: admissionInterviews.id })
    .from(admissionInterviews)
    .where(
      and(
        eq(admissionInterviews.guestDni, dni),
        isNull(admissionInterviews.annulledAt),
      ),
    );
  return interviews.map(({ id }) => id);
}

export type AdmissionInterviewRecord =
  typeof admissionInterviews.$inferSelect & {
    surgeryOptionIds: string[];
  };

async function listSurgeryOptionIds(
  database: DatabaseTransaction | ReturnType<typeof getDatabase>,
  interviewId: string,
): Promise<string[]> {
  const surgeries = await database
    .select({ surgeryOptionId: admissionInterviewSurgeries.surgeryOptionId })
    .from(admissionInterviewSurgeries)
    .where(eq(admissionInterviewSurgeries.admissionInterviewId, interviewId));
  return surgeries.map(({ surgeryOptionId }) => surgeryOptionId);
}

export async function findAdmissionInterviewRecord(
  interviewId: string,
): Promise<AdmissionInterviewRecord | null> {
  const database = getDatabase();
  const [interview] = await database
    .select()
    .from(admissionInterviews)
    .where(eq(admissionInterviews.id, interviewId));
  if (!interview) {
    return null;
  }
  return {
    ...interview,
    surgeryOptionIds: await listSurgeryOptionIds(database, interviewId),
  };
}

export async function lockAdmissionInterviewRecord(
  transaction: DatabaseTransaction,
  interviewId: string,
): Promise<AdmissionInterviewRecord | null> {
  const [interview] = await transaction
    .select()
    .from(admissionInterviews)
    .where(eq(admissionInterviews.id, interviewId))
    .for("update");
  if (!interview) {
    return null;
  }
  return {
    ...interview,
    surgeryOptionIds: await listSurgeryOptionIds(transaction, interviewId),
  };
}

export async function annulAdmissionInterviewRecord(
  transaction: DatabaseTransaction,
  interviewId: string,
  reason: string,
  actorUserId: string,
): Promise<void> {
  await transaction
    .update(admissionInterviews)
    .set({
      annulledAt: sql`now()`,
      annulledByUserId: actorUserId,
      annulmentReason: reason,
    })
    .where(eq(admissionInterviews.id, interviewId));
}

export async function updateAdmissionInterviewRecord(
  transaction: DatabaseTransaction,
  interviewId: string,
  { surgeryOptionIds, ...details }: AdmissionInterviewDetails,
  savedSurgeryOptionIds: readonly string[],
  actorUserId: string,
): Promise<void> {
  await transaction
    .update(admissionInterviews)
    .set({ ...details, updatedByUserId: actorUserId, updatedAt: sql`now()` })
    .where(eq(admissionInterviews.id, interviewId));
  const removedSurgeryOptionIds = savedSurgeryOptionIds.filter(
    (optionId) => !surgeryOptionIds.includes(optionId),
  );
  const addedSurgeryOptionIds = surgeryOptionIds.filter(
    (optionId) => !savedSurgeryOptionIds.includes(optionId),
  );
  if (removedSurgeryOptionIds.length > 0) {
    await transaction
      .delete(admissionInterviewSurgeries)
      .where(
        and(
          eq(admissionInterviewSurgeries.admissionInterviewId, interviewId),
          inArray(
            admissionInterviewSurgeries.surgeryOptionId,
            removedSurgeryOptionIds,
          ),
        ),
      );
  }
  if (addedSurgeryOptionIds.length > 0) {
    await transaction.insert(admissionInterviewSurgeries).values(
      addedSurgeryOptionIds.map((surgeryOptionId) => ({
        admissionInterviewId: interviewId,
        surgeryOptionId,
      })),
    );
  }
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
  return and(
    isNull(admissionInterviews.annulledAt),
    searchTerm
      ? containsNormalizedTextSql(SEARCHABLE_TEXT, searchTerm)
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

export type AdmissionInterviewCounts = {
  createdSinceCount: number;
  activeCount: number;
  acceptedCount: number;
};

export async function countAdmissionInterviewsForReport(
  windowStart: Date,
  acceptedInterviewIds: readonly string[],
): Promise<AdmissionInterviewCounts> {
  const [counts] = await getDatabase()
    .select({
      createdSinceCount:
        sql<number>`count(*) filter (where ${admissionInterviews.createdAt} >= ${windowStart})`.mapWith(
          Number,
        ),
      activeCount: count(),
      acceptedCount:
        sql<number>`count(*) filter (where ${inArray(admissionInterviews.id, [...acceptedInterviewIds])})`.mapWith(
          Number,
        ),
    })
    .from(admissionInterviews)
    .where(isNull(admissionInterviews.annulledAt));
  return {
    createdSinceCount: counts?.createdSinceCount ?? 0,
    activeCount: counts?.activeCount ?? 0,
    acceptedCount: counts?.acceptedCount ?? 0,
  };
}
