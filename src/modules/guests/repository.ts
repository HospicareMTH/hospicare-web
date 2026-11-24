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
import { findAddedAndRemoved } from "@/platform/selection-changes";

import type { GuestDetails, GuestListQuery, GuestSortKey } from "./schemas";
import {
  type GuestOrigin,
  guestHospitalizationReasons,
  guests,
  guestUncontrolledSymptoms,
} from "./tables";

export type GuestRecord = typeof guests.$inferSelect & {
  hospitalizationReasonOptionIds: string[];
  uncontrolledSymptomOptionIds: string[];
};

type GuestDatabase = DatabaseTransaction | ReturnType<typeof getDatabase>;

async function listSelectedOptionIds(
  database: GuestDatabase,
  guestId: string,
): Promise<
  Pick<
    GuestRecord,
    "hospitalizationReasonOptionIds" | "uncontrolledSymptomOptionIds"
  >
> {
  // Van una detrás de otra: dentro de una transacción hay una sola conexión.
  const reasons = await database
    .select({ id: guestHospitalizationReasons.hospitalizationReasonOptionId })
    .from(guestHospitalizationReasons)
    .where(eq(guestHospitalizationReasons.guestId, guestId));
  const symptoms = await database
    .select({ id: guestUncontrolledSymptoms.uncontrolledSymptomOptionId })
    .from(guestUncontrolledSymptoms)
    .where(eq(guestUncontrolledSymptoms.guestId, guestId));
  return {
    hospitalizationReasonOptionIds: reasons.map(({ id }) => id),
    uncontrolledSymptomOptionIds: symptoms.map(({ id }) => id),
  };
}

export async function findGuestRecord(
  guestId: string,
): Promise<GuestRecord | null> {
  const database = getDatabase();
  const [guest] = await database
    .select()
    .from(guests)
    .where(eq(guests.id, guestId));
  if (!guest) {
    return null;
  }
  return { ...guest, ...(await listSelectedOptionIds(database, guestId)) };
}

export async function lockGuestRecord(
  transaction: DatabaseTransaction,
  guestId: string,
): Promise<GuestRecord | null> {
  const [guest] = await transaction
    .select()
    .from(guests)
    .where(eq(guests.id, guestId))
    .for("update");
  if (!guest) {
    return null;
  }
  return { ...guest, ...(await listSelectedOptionIds(transaction, guestId)) };
}

export async function annulGuestRecord(
  transaction: DatabaseTransaction,
  guestId: string,
  reason: string,
  actorUserId: string,
): Promise<void> {
  await transaction
    .update(guests)
    .set({
      annulledAt: sql`now()`,
      annulledByUserId: actorUserId,
      annulmentReason: reason,
    })
    .where(eq(guests.id, guestId));
}

export async function updateGuestRecord(
  transaction: DatabaseTransaction,
  saved: GuestRecord,
  {
    hospitalizationReasonOptionIds,
    uncontrolledSymptomOptionIds,
    ...details
  }: GuestDetails,
  actorUserId: string,
): Promise<void> {
  await transaction
    .update(guests)
    .set({ ...details, updatedByUserId: actorUserId, updatedAt: sql`now()` })
    .where(eq(guests.id, saved.id));

  const reasons = findAddedAndRemoved(
    saved.hospitalizationReasonOptionIds,
    hospitalizationReasonOptionIds,
  );
  if (reasons.removedIds.length > 0) {
    await transaction
      .delete(guestHospitalizationReasons)
      .where(
        and(
          eq(guestHospitalizationReasons.guestId, saved.id),
          inArray(
            guestHospitalizationReasons.hospitalizationReasonOptionId,
            reasons.removedIds,
          ),
        ),
      );
  }
  if (reasons.addedIds.length > 0) {
    await transaction.insert(guestHospitalizationReasons).values(
      reasons.addedIds.map((hospitalizationReasonOptionId) => ({
        guestId: saved.id,
        hospitalizationReasonOptionId,
      })),
    );
  }

  const symptoms = findAddedAndRemoved(
    saved.uncontrolledSymptomOptionIds,
    uncontrolledSymptomOptionIds,
  );
  if (symptoms.removedIds.length > 0) {
    await transaction
      .delete(guestUncontrolledSymptoms)
      .where(
        and(
          eq(guestUncontrolledSymptoms.guestId, saved.id),
          inArray(
            guestUncontrolledSymptoms.uncontrolledSymptomOptionId,
            symptoms.removedIds,
          ),
        ),
      );
  }
  if (symptoms.addedIds.length > 0) {
    await transaction.insert(guestUncontrolledSymptoms).values(
      symptoms.addedIds.map((uncontrolledSymptomOptionId) => ({
        guestId: saved.id,
        uncontrolledSymptomOptionId,
      })),
    );
  }
}

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

export type AnnulledInterviewGuestRecord = InterviewGuestRecord & {
  annulledAt: Date;
};

export async function findLatestAnnulledGuestOfInterview(
  admissionInterviewId: string,
): Promise<AnnulledInterviewGuestRecord | null> {
  const [guest] = await getDatabase()
    .select({
      id: guests.id,
      clinicalRecordNumber: guests.clinicalRecordNumber,
      createdAt: guests.createdAt,
      annulledAt: guests.annulledAt,
    })
    .from(guests)
    .where(
      and(
        eq(guests.admissionInterviewId, admissionInterviewId),
        isNotNull(guests.annulledAt),
      ),
    )
    .orderBy(desc(guests.annulledAt))
    .limit(1);
  if (!guest?.annulledAt) {
    return null;
  }
  return { ...guest, annulledAt: guest.annulledAt };
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

export async function hasActiveGuestWithDni(
  dni: string,
  excludedGuestId: string | null,
): Promise<boolean> {
  const [guest] = await getDatabase()
    .select({ id: guests.id })
    .from(guests)
    .where(
      and(
        eq(guests.dni, dni),
        isNull(guests.annulledAt),
        excludedGuestId ? ne(guests.id, excludedGuestId) : undefined,
      ),
    )
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
