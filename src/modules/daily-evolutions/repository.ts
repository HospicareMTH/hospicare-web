import { desc, eq } from "drizzle-orm";

import {
  type DatabaseTransaction,
  getDatabase,
} from "@/platform/database/client";

import { dailyEvolutions } from "./tables";

export type DailyEvolutionRecord = typeof dailyEvolutions.$inferSelect;

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

export function listDailyEvolutionRecords(
  guestId: string,
): Promise<DailyEvolutionRecord[]> {
  return getDatabase()
    .select()
    .from(dailyEvolutions)
    .where(eq(dailyEvolutions.guestId, guestId))
    .orderBy(desc(dailyEvolutions.createdAt), desc(dailyEvolutions.id));
}
