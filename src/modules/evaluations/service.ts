import { findUserNames } from "@/modules/access";
import {
  GUEST_REJECTION_MESSAGES,
  type GuestToEvaluate,
  guestIdSchema,
  lockGuestToEvaluate,
} from "@/modules/guests";
import {
  type DatabaseTransaction,
  runInTransactionAs,
} from "@/platform/database/client";
import {
  type OperationResult,
  type RejectedOperation,
  reject,
  SUCCESS,
} from "@/platform/operation-result";

import {
  findCamEvaluationRecordOfGuest,
  insertCamEvaluation,
  lockCamEvaluationRecordOfGuest,
  updateCamEvaluationRecord,
} from "./repository";
import type { CamEvaluationDetails, CamEvaluationInput } from "./schemas";
import type { CamStoppingCriterion } from "./tables";

export const CAM_EVALUATION_REJECTION_MESSAGES = {
  alreadyExists:
    "Este huésped ya tiene su evaluación CAM. Actualizá la pantalla para verla y modificarla.",
  notFound:
    "Este huésped todavía no tiene evaluación CAM. Actualizá la pantalla para cargarla.",
  changedMeanwhile:
    "Otra persona cambió la evaluación CAM mientras la editabas, así que tus cambios no se guardaron. Actualizá la pantalla para ver la versión actual.",
} as const;

function toVersion(updatedAt: Date): string {
  return updatedAt.toISOString();
}

function findGuestRejection(
  guest: GuestToEvaluate | null,
): RejectedOperation | null {
  if (!guest) {
    return reject(GUEST_REJECTION_MESSAGES.notFound);
  }
  if (guest.isAnnulled) {
    return reject(GUEST_REJECTION_MESSAGES.annulled);
  }
  return null;
}

async function lockGuestForChange(
  transaction: DatabaseTransaction,
  guestId: string,
): Promise<RejectedOperation | null> {
  return findGuestRejection(await lockGuestToEvaluate(transaction, guestId));
}

export function createCamEvaluation(
  actorUserId: string,
  guestId: string,
  details: CamEvaluationDetails,
): Promise<OperationResult> {
  return runInTransactionAs(actorUserId, async (transaction) => {
    const guestRejection = await lockGuestForChange(transaction, guestId);
    if (guestRejection) {
      return guestRejection;
    }
    if (await lockCamEvaluationRecordOfGuest(transaction, guestId)) {
      return reject(CAM_EVALUATION_REJECTION_MESSAGES.alreadyExists);
    }
    await insertCamEvaluation(transaction, guestId, details, actorUserId);
    return SUCCESS;
  });
}

export function updateCamEvaluation(
  actorUserId: string,
  guestId: string,
  expectedVersion: string,
  details: CamEvaluationDetails,
): Promise<OperationResult> {
  return runInTransactionAs(actorUserId, async (transaction) => {
    const guestRejection = await lockGuestForChange(transaction, guestId);
    if (guestRejection) {
      return guestRejection;
    }
    const saved = await lockCamEvaluationRecordOfGuest(transaction, guestId);
    if (!saved) {
      return reject(CAM_EVALUATION_REJECTION_MESSAGES.notFound);
    }
    if (toVersion(saved.updatedAt) !== expectedVersion) {
      return reject(CAM_EVALUATION_REJECTION_MESSAGES.changedMeanwhile);
    }
    await updateCamEvaluationRecord(
      transaction,
      saved.id,
      details,
      actorUserId,
    );
    return SUCCESS;
  });
}

export type CamEvaluationView = {
  version: string;
  input: CamEvaluationInput;
  isDeliriumLikely: boolean;
  stoppedAtCriterion: CamStoppingCriterion | null;
  createdAt: Date;
  createdByName: string | null;
  updatedAt: Date;
  updatedByName: string | null;
};

export async function findCamEvaluationOfGuest(
  candidateGuestId: string,
): Promise<CamEvaluationView | null> {
  const parsedGuestId = guestIdSchema.safeParse(candidateGuestId);
  if (!parsedGuestId.success) {
    return null;
  }
  const record = await findCamEvaluationRecordOfGuest(parsedGuestId.data);
  if (!record) {
    return null;
  }
  const userNames = await findUserNames(
    [record.createdByUserId, record.updatedByUserId].flatMap((userId) =>
      userId ? [userId] : [],
    ),
  );
  const nameOf = (userId: string | null) =>
    userId ? (userNames.get(userId) ?? null) : null;
  return {
    version: toVersion(record.updatedAt),
    input: {
      evaluationDate: record.evaluationDate,
      acuteOnset: record.acuteOnset,
      inattention: record.inattention,
      disorganizedThinking: record.disorganizedThinking,
      alteredConsciousness: record.alteredConsciousness,
      observations: record.observations ?? "",
    },
    isDeliriumLikely: record.isDeliriumLikely,
    stoppedAtCriterion: record.stoppedAtCriterion,
    createdAt: record.createdAt,
    createdByName: nameOf(record.createdByUserId),
    updatedAt: record.updatedAt,
    updatedByName: nameOf(record.updatedByUserId),
  };
}
