import {
  and,
  asc,
  count,
  desc,
  eq,
  inArray,
  isNotNull,
  isNull,
  or,
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

import type { GuestDetails, GuestListQuery, GuestSortKey } from "./schemas";
import {
  type GuestOrigin,
  guestHospitalizationReasons,
  guests,
  guestUncontrolledSymptoms,
} from "./tables";

export type GuestListRecord = {
  id: string;
  clinicalRecordNumber: number;
  firstName: string;
  lastName: string;
  dni: string;
  hospitalizationDate: string;
  healthInsuranceOptionId: string | null;
  healthInsuranceMemberNumber: string | null;
  origin: GuestOrigin;
  createdAt: Date;
};

const LIST_COLUMNS = {
  id: guests.id,
  clinicalRecordNumber: guests.clinicalRecordNumber,
  firstName: guests.firstName,
  lastName: guests.lastName,
  dni: guests.dni,
  hospitalizationDate: guests.hospitalizationDate,
  healthInsuranceOptionId: guests.healthInsuranceOptionId,
  healthInsuranceMemberNumber: guests.healthInsuranceMemberNumber,
  origin: guests.origin,
  createdAt: guests.createdAt,
};

const SEARCHABLE_TEXT = normalizeTextSql(
  sql`concat_ws(' ', ${guests.firstName}, ${guests.lastName}, ${guests.dni})`,
);

const SORT_EXPRESSIONS: Record<GuestSortKey, SQL[]> = {
  hospitalizationDate: [sql`${guests.hospitalizationDate}`],
  guestName: [
    normalizeTextSql(sql`${guests.firstName}`),
    normalizeTextSql(sql`${guests.lastName}`),
  ],
  dni: [sql`${guests.dni}::integer`],
  createdAt: [sql`${guests.createdAt}`],
};

export type GuestSearch = Omit<GuestListQuery, "search"> & {
  searchTerm: string;
  clinicalRecordNumber: number | null;
  matchingHealthInsuranceOptionIds: string[];
};

function buildSearchMatch({
  searchTerm,
  clinicalRecordNumber,
  matchingHealthInsuranceOptionIds,
}: GuestSearch): SQL | undefined {
  if (!searchTerm) {
    return undefined;
  }
  return or(
    containsNormalizedTextSql(SEARCHABLE_TEXT, searchTerm),
    clinicalRecordNumber === null
      ? undefined
      : eq(guests.clinicalRecordNumber, clinicalRecordNumber),
    matchingHealthInsuranceOptionIds.length === 0
      ? undefined
      : inArray(
          guests.healthInsuranceOptionId,
          matchingHealthInsuranceOptionIds,
        ),
  );
}

function buildListFilter(search: GuestSearch): SQL | undefined {
  return and(
    isNull(guests.annulledAt),
    buildSearchMatch(search),
    search.origin ? eq(guests.origin, search.origin) : undefined,
  );
}

export async function countGuestRecords(search: GuestSearch): Promise<number> {
  const [result] = await getDatabase()
    .select({ total: count() })
    .from(guests)
    .where(buildListFilter(search));
  return result?.total ?? 0;
}

export function listGuestRecords(
  search: GuestSearch,
  { offset, limit }: { offset: number; limit: number },
): Promise<GuestListRecord[]> {
  const direction = search.sort.isDescending ? desc : asc;
  return getDatabase()
    .select(LIST_COLUMNS)
    .from(guests)
    .where(buildListFilter(search))
    .orderBy(
      ...SORT_EXPRESSIONS[search.sort.key].map((expression) =>
        direction(expression),
      ),
      asc(guests.id),
    )
    .offset(offset)
    .limit(limit);
}

type NewGuestRecord = {
  details: GuestDetails;
  clinicalRecordNumber: number;
  origin: GuestOrigin;
  admissionInterviewId: string | null;
  actorUserId: string;
};

export async function insertGuest(
  transaction: DatabaseTransaction,
  {
    details: {
      hospitalizationReasonOptionIds,
      uncontrolledSymptomOptionIds,
      ...details
    },
    clinicalRecordNumber,
    origin,
    admissionInterviewId,
    actorUserId,
  }: NewGuestRecord,
): Promise<string> {
  const [guest] = await transaction
    .insert(guests)
    .values({
      ...details,
      clinicalRecordNumber,
      origin,
      admissionInterviewId,
      createdByUserId: actorUserId,
      updatedByUserId: actorUserId,
    })
    .returning({ id: guests.id });
  if (!guest) {
    throw new Error("La base no devolvió el huésped creado.");
  }
  if (hospitalizationReasonOptionIds.length > 0) {
    await transaction.insert(guestHospitalizationReasons).values(
      hospitalizationReasonOptionIds.map((hospitalizationReasonOptionId) => ({
        guestId: guest.id,
        hospitalizationReasonOptionId,
      })),
    );
  }
  if (uncontrolledSymptomOptionIds.length > 0) {
    await transaction.insert(guestUncontrolledSymptoms).values(
      uncontrolledSymptomOptionIds.map((uncontrolledSymptomOptionId) => ({
        guestId: guest.id,
        uncontrolledSymptomOptionId,
      })),
    );
  }
  return guest.id;
}

export type InterviewGuestRecord = {
  id: string;
  clinicalRecordNumber: number;
  createdAt: Date;
};

export async function findActiveGuestOfInterview(
  database: DatabaseTransaction | ReturnType<typeof getDatabase>,
  admissionInterviewId: string,
): Promise<InterviewGuestRecord | null> {
  const [guest] = await database
    .select({
      id: guests.id,
      clinicalRecordNumber: guests.clinicalRecordNumber,
      createdAt: guests.createdAt,
    })
    .from(guests)
    .where(
      and(
        eq(guests.admissionInterviewId, admissionInterviewId),
        isNull(guests.annulledAt),
      ),
    );
  return guest ?? null;
}

export async function listInterviewIdsWithActiveGuest(
  admissionInterviewIds: readonly string[],
): Promise<string[]> {
  if (admissionInterviewIds.length === 0) {
    return [];
  }
  const rows = await getDatabase()
    .select({ id: guests.admissionInterviewId })
    .from(guests)
    .where(
      and(
        inArray(guests.admissionInterviewId, [...admissionInterviewIds]),
        isNull(guests.annulledAt),
      ),
    );
  return rows.flatMap(({ id }) => (id ? [id] : []));
}

export async function hasActiveGuestWithDni(dni: string): Promise<boolean> {
  const [guest] = await getDatabase()
    .select({ id: guests.id })
    .from(guests)
    .where(and(eq(guests.dni, dni), isNull(guests.annulledAt)))
    .limit(1);
  return guest !== undefined;
}

export async function listUsedHealthInsuranceOptionIds(): Promise<string[]> {
  const rows = await getDatabase()
    .selectDistinct({ id: guests.healthInsuranceOptionId })
    .from(guests)
    .where(
      and(isNull(guests.annulledAt), isNotNull(guests.healthInsuranceOptionId)),
    );
  return rows.flatMap(({ id }) => (id ? [id] : []));
}
