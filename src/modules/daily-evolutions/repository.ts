import { and, asc, count, desc, eq, gte, inArray, isNull } from "drizzle-orm";

import {
  type DatabaseTransaction,
  getDatabase,
} from "@/platform/database/client";

import { dailyEvolutionClarifications, dailyEvolutions } from "./tables";

export type DailyEvolutionRecord = typeof dailyEvolutions.$inferSelect;

export type ClarificationRecord =
  typeof dailyEvolutionClarifications.$inferSelect;

export async function insertDailyEvolution(
  transaction: DatabaseTransaction,
  values: {
    guestId: string;
    authorUserId: string;
    signature: string;
    text: string;
    registeredAt: Date;
    editableUntil: Date;
  },
): Promise<void> {
  await transaction.insert(dailyEvolutions).values({
    guestId: values.guestId,
    authorUserId: values.authorUserId,
    signature: values.signature,
    text: values.text,
    createdAt: values.registeredAt,
    updatedAt: values.registeredAt,
    editableUntil: values.editableUntil,
  });
}

export function listActiveDailyEvolutionRecords(
  guestId: string,
): Promise<DailyEvolutionRecord[]> {
  return getDatabase()
    .select()
    .from(dailyEvolutions)
    .where(
      and(
        eq(dailyEvolutions.guestId, guestId),
        isNull(dailyEvolutions.annulledAt),
      ),
    )
    .orderBy(desc(dailyEvolutions.createdAt), desc(dailyEvolutions.id));
}

export async function findDailyEvolutionGuestId(
  evolutionId: string,
): Promise<string | null> {
  const [evolution] = await getDatabase()
    .select({ guestId: dailyEvolutions.guestId })
    .from(dailyEvolutions)
    .where(eq(dailyEvolutions.id, evolutionId));
  return evolution?.guestId ?? null;
}

export async function lockDailyEvolutionRecord(
  transaction: DatabaseTransaction,
  evolutionId: string,
): Promise<DailyEvolutionRecord | null> {
  const [evolution] = await transaction
    .select()
    .from(dailyEvolutions)
    .where(eq(dailyEvolutions.id, evolutionId))
    .for("update");
  return evolution ?? null;
}

export async function updateDailyEvolutionText(
  transaction: DatabaseTransaction,
  evolutionId: string,
  text: string,
  updatedAt: Date,
): Promise<void> {
  await transaction
    .update(dailyEvolutions)
    .set({ text, updatedAt })
    .where(eq(dailyEvolutions.id, evolutionId));
}

export async function annulDailyEvolutionRecord(
  transaction: DatabaseTransaction,
  evolutionId: string,
  reason: string,
  annulledAt: Date,
): Promise<void> {
  await transaction
    .update(dailyEvolutions)
    .set({ annulledAt, annulmentReason: reason })
    .where(eq(dailyEvolutions.id, evolutionId));
}

export async function insertClarification(
  transaction: DatabaseTransaction,
  values: {
    dailyEvolutionId: string;
    authorUserId: string;
    signature: string;
    text: string;
    createdAt: Date;
  },
): Promise<void> {
  await transaction.insert(dailyEvolutionClarifications).values(values);
}

export function listClarificationRecords(
  evolutionIds: readonly string[],
): Promise<ClarificationRecord[]> {
  if (evolutionIds.length === 0) {
    return Promise.resolve([]);
  }
  return getDatabase()
    .select()
    .from(dailyEvolutionClarifications)
    .where(
      inArray(dailyEvolutionClarifications.dailyEvolutionId, [...evolutionIds]),
    )
    .orderBy(
      asc(dailyEvolutionClarifications.createdAt),
      asc(dailyEvolutionClarifications.id),
    );
}

export async function countActiveDailyEvolutionsSince(
  windowStart: Date,
  guestIds: readonly string[],
): Promise<number> {
  const [counts] = await getDatabase()
    .select({ total: count() })
    .from(dailyEvolutions)
    .where(
      and(
        isNull(dailyEvolutions.annulledAt),
        gte(dailyEvolutions.createdAt, windowStart),
        inArray(dailyEvolutions.guestId, [...guestIds]),
      ),
    );
  return counts?.total ?? 0;
}
