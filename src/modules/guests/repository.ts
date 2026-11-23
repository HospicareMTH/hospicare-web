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

import { getDatabase } from "@/platform/database/client";
import {
  containsNormalizedTextSql,
  normalizeTextSql,
} from "@/platform/database/text-normalization";

import type { GuestListQuery, GuestSortKey } from "./schemas";
import { type GuestOrigin, guests } from "./tables";

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

export async function listUsedHealthInsuranceOptionIds(): Promise<string[]> {
  const rows = await getDatabase()
    .selectDistinct({ id: guests.healthInsuranceOptionId })
    .from(guests)
    .where(
      and(isNull(guests.annulledAt), isNotNull(guests.healthInsuranceOptionId)),
    );
  return rows.flatMap(({ id }) => (id ? [id] : []));
}
