import { and, count, eq, inArray, sql } from "drizzle-orm";

import {
  type DatabaseTransaction,
  getDatabase,
} from "@/platform/database/client";
import { findAddedAndRemoved } from "@/platform/selection-changes";

import type {
  CamEvaluationDetails,
  PhysicalEvaluationDetails,
} from "./schemas";
import {
  camEvaluations,
  physicalAdmissionEvaluations,
  physicalEvaluationCatarsisConsistencyOptions,
  physicalEvaluationCatarsisOptions,
  physicalEvaluationHygieneOptions,
  physicalEvaluationMouthOptions,
} from "./tables";

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

const SELECTION_TABLES = {
  hygieneOptionIds: physicalEvaluationHygieneOptions,
  mouthOptionIds: physicalEvaluationMouthOptions,
  catarsisOptionIds: physicalEvaluationCatarsisOptions,
  catarsisConsistencyOptionIds: physicalEvaluationCatarsisConsistencyOptions,
} as const;

type SelectionField = keyof typeof SELECTION_TABLES;

const SELECTION_FIELDS: readonly SelectionField[] = [
  "hygieneOptionIds",
  "mouthOptionIds",
  "catarsisOptionIds",
  "catarsisConsistencyOptionIds",
];

export type PhysicalEvaluationSelections = Record<SelectionField, string[]>;

export type PhysicalEvaluationRecord =
  typeof physicalAdmissionEvaluations.$inferSelect &
    PhysicalEvaluationSelections;

function buildEmptySelections(): PhysicalEvaluationSelections {
  return {
    hygieneOptionIds: [],
    mouthOptionIds: [],
    catarsisOptionIds: [],
    catarsisConsistencyOptionIds: [],
  };
}

type EvaluationDatabase = DatabaseTransaction | ReturnType<typeof getDatabase>;

async function listSelections(
  database: EvaluationDatabase,
  guestId: string,
): Promise<PhysicalEvaluationSelections> {
  const selections = buildEmptySelections();
  // Van una detrás de otra: dentro de una transacción hay una sola conexión.
  for (const field of SELECTION_FIELDS) {
    const table = SELECTION_TABLES[field];
    const rows = await database
      .select({ optionId: table.optionId })
      .from(table)
      .where(eq(table.guestId, guestId));
    selections[field] = rows.map(({ optionId }) => optionId);
  }
  return selections;
}

export async function findPhysicalEvaluationRecordOfGuest(
  guestId: string,
): Promise<PhysicalEvaluationRecord | null> {
  const database = getDatabase();
  const [evaluation] = await database
    .select()
    .from(physicalAdmissionEvaluations)
    .where(eq(physicalAdmissionEvaluations.guestId, guestId));
  if (!evaluation) {
    return null;
  }
  return { ...evaluation, ...(await listSelections(database, guestId)) };
}

export async function lockPhysicalEvaluationRecordOfGuest(
  transaction: DatabaseTransaction,
  guestId: string,
): Promise<PhysicalEvaluationRecord | null> {
  const [evaluation] = await transaction
    .select()
    .from(physicalAdmissionEvaluations)
    .where(eq(physicalAdmissionEvaluations.guestId, guestId))
    .for("update");
  if (!evaluation) {
    return null;
  }
  return { ...evaluation, ...(await listSelections(transaction, guestId)) };
}

function splitSelections({
  hygieneOptionIds,
  mouthOptionIds,
  catarsisOptionIds,
  catarsisConsistencyOptionIds,
  ...columns
}: PhysicalEvaluationDetails) {
  return {
    columns,
    selections: {
      hygieneOptionIds,
      mouthOptionIds,
      catarsisOptionIds,
      catarsisConsistencyOptionIds,
    },
  };
}

async function saveSelectionChanges(
  transaction: DatabaseTransaction,
  guestId: string,
  saved: PhysicalEvaluationSelections,
  next: PhysicalEvaluationSelections,
): Promise<void> {
  for (const field of SELECTION_FIELDS) {
    const table = SELECTION_TABLES[field];
    const { addedIds, removedIds } = findAddedAndRemoved(
      saved[field],
      next[field],
    );
    if (removedIds.length > 0) {
      await transaction
        .delete(table)
        .where(
          and(eq(table.guestId, guestId), inArray(table.optionId, removedIds)),
        );
    }
    if (addedIds.length > 0) {
      await transaction
        .insert(table)
        .values(addedIds.map((optionId) => ({ guestId, optionId })));
    }
  }
}

export async function insertPhysicalEvaluation(
  transaction: DatabaseTransaction,
  guestId: string,
  details: PhysicalEvaluationDetails,
  actorUserId: string,
): Promise<void> {
  const { columns, selections } = splitSelections(details);
  await transaction.insert(physicalAdmissionEvaluations).values({
    guestId,
    ...columns,
    createdByUserId: actorUserId,
    updatedByUserId: actorUserId,
  });
  await saveSelectionChanges(
    transaction,
    guestId,
    buildEmptySelections(),
    selections,
  );
}

export async function updatePhysicalEvaluationRecord(
  transaction: DatabaseTransaction,
  saved: PhysicalEvaluationRecord,
  details: PhysicalEvaluationDetails,
  actorUserId: string,
): Promise<void> {
  const { columns, selections } = splitSelections(details);
  await transaction
    .update(physicalAdmissionEvaluations)
    .set({ ...columns, updatedByUserId: actorUserId, updatedAt: sql`now()` })
    .where(eq(physicalAdmissionEvaluations.id, saved.id));
  await saveSelectionChanges(transaction, saved.guestId, saved, selections);
}

export type CamEvaluationReportCounts = {
  evaluatedCount: number;
  deliriumLikelyCount: number;
};

export async function countCamEvaluationsForReport(
  guestIds: readonly string[],
): Promise<CamEvaluationReportCounts> {
  const [counts] = await getDatabase()
    .select({
      evaluatedCount: count(),
      deliriumLikelyCount:
        sql<number>`count(*) filter (where ${camEvaluations.isDeliriumLikely})`.mapWith(
          Number,
        ),
    })
    .from(camEvaluations)
    .where(inArray(camEvaluations.guestId, [...guestIds]));
  return {
    evaluatedCount: counts?.evaluatedCount ?? 0,
    deliriumLikelyCount: counts?.deliriumLikelyCount ?? 0,
  };
}

export type PhysicalEvaluationReportCounts = {
  evaluatedCount: number;
  pressureUlcerCount: number;
};

export async function countPhysicalEvaluationsForReport(
  guestIds: readonly string[],
): Promise<PhysicalEvaluationReportCounts> {
  const [counts] = await getDatabase()
    .select({
      evaluatedCount: count(),
      pressureUlcerCount:
        sql<number>`count(*) filter (where ${physicalAdmissionEvaluations.hasPressureUlcers})`.mapWith(
          Number,
        ),
    })
    .from(physicalAdmissionEvaluations)
    .where(inArray(physicalAdmissionEvaluations.guestId, [...guestIds]));
  return {
    evaluatedCount: counts?.evaluatedCount ?? 0,
    pressureUlcerCount: counts?.pressureUlcerCount ?? 0,
  };
}
