import { eq, sql } from "drizzle-orm";

import {
  type DatabaseTransaction,
  getDatabase,
} from "@/platform/database/client";

import type { CamEvaluationDetails } from "./schemas";
import { camEvaluations } from "./tables";

export type CamEvaluationRecord = typeof camEvaluations.$inferSelect;

export async function findCamEvaluationRecordOfGuest(
  guestId: string,
): Promise<CamEvaluationRecord | null> {
  const [evaluation] = await getDatabase()
    .select()
    .from(camEvaluations)
    .where(eq(camEvaluations.guestId, guestId));
  return evaluation ?? null;
}

export async function lockCamEvaluationRecordOfGuest(
  transaction: DatabaseTransaction,
  guestId: string,
): Promise<CamEvaluationRecord | null> {
  const [evaluation] = await transaction
    .select()
    .from(camEvaluations)
    .where(eq(camEvaluations.guestId, guestId))
    .for("update");
  return evaluation ?? null;
}

export async function insertCamEvaluation(
  transaction: DatabaseTransaction,
  guestId: string,
  details: CamEvaluationDetails,
  actorUserId: string,
): Promise<void> {
  await transaction.insert(camEvaluations).values({
    guestId,
    ...details,
    createdByUserId: actorUserId,
    updatedByUserId: actorUserId,
  });
}

export async function updateCamEvaluationRecord(
  transaction: DatabaseTransaction,
  evaluationId: string,
  details: CamEvaluationDetails,
  actorUserId: string,
): Promise<void> {
  await transaction
    .update(camEvaluations)
    .set({ ...details, updatedByUserId: actorUserId, updatedAt: sql`now()` })
    .where(eq(camEvaluations.id, evaluationId));
}
