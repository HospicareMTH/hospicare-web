import { findSigner, findUserNames } from "@/modules/access";
import { findActiveProfessionalSpecialty } from "@/modules/catalogs";
import { guestIdSchema, lockGuestForClinicalChange } from "@/modules/guests";
import {
  computeEditableUntil,
  getDailyEvolutionEditWindow,
} from "@/modules/settings";
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
  annulDailyEvolutionRecord,
  type DailyEvolutionRecord,
  findDailyEvolutionGuestId,
  insertClarification,
  insertDailyEvolution,
  listActiveDailyEvolutionRecords,
  listClarificationRecords,
  lockDailyEvolutionRecord,
  updateDailyEvolutionText,
} from "./repository";

export const DAILY_EVOLUTION_REJECTION_MESSAGES = {
  notAuthor: "Solo quien escribió esta evolución puede corregirla o anularla.",
  outOfWindow:
    "Ya pasó el tiempo para corregir esta evolución. Podés agregarle una nota aclaratoria.",
  notAvailable:
    "Esta evolución ya no está en el historial. Actualizá la pantalla.",
  changedMeanwhile:
    "Otra persona cambió esta evolución mientras la editabas, así que tus cambios no se guardaron. Actualizá la pantalla para ver la versión actual.",
} as const;

// RF-EVO-03 y CA-09: la especialidad del profesional activo con el mismo correo; si no la hay, el rol.
export async function resolveSignature(userId: string): Promise<string> {
  const signer = await findSigner(userId);
  if (!signer?.roleName) {
    throw new Error("La persona que registra no tiene un rol asignado.");
  }
  const specialty = await findActiveProfessionalSpecialty(signer.email);
  return specialty ?? signer.roleName;
}

function toVersion(updatedAt: Date): string {
  return updatedAt.toISOString();
}

// RN-07: con bloqueo inmediato el límite es el mismo registro, así que nunca se está dentro.
export function isWithinEditWindow(
  evolution: Pick<DailyEvolutionRecord, "editableUntil">,
  now: Date,
): boolean {
  return now.getTime() <= evolution.editableUntil.getTime();
}

export async function registerDailyEvolution(
  actorUserId: string,
  guestId: string,
  text: string,
): Promise<OperationResult> {
  const [signature, editWindow] = await Promise.all([
    resolveSignature(actorUserId),
    getDailyEvolutionEditWindow(),
  ]);
  return runInTransactionAs(actorUserId, async (transaction) => {
    const guestRejection = await lockGuestForClinicalChange(
      transaction,
      guestId,
    );
    if (guestRejection) {
      return guestRejection;
    }
    const registeredAt = new Date();
    await insertDailyEvolution(transaction, {
      guestId,
      authorUserId: actorUserId,
      signature,
      text,
      registeredAt,
      editableUntil: computeEditableUntil(editWindow, registeredAt),
    });
    return SUCCESS;
  });
}

type LockedEvolution =
  { status: "locked"; evolution: DailyEvolutionRecord } | RejectedOperation;

// Bloquea primero al huésped, como al registrar, y después la evolución.
async function lockActiveEvolution(
  transaction: DatabaseTransaction,
  evolutionId: string,
): Promise<LockedEvolution> {
  const guestId = await findDailyEvolutionGuestId(evolutionId);
  if (!guestId) {
    return reject(DAILY_EVOLUTION_REJECTION_MESSAGES.notAvailable);
  }
  const guestRejection = await lockGuestForClinicalChange(transaction, guestId);
  if (guestRejection) {
    return guestRejection;
  }
  const evolution = await lockDailyEvolutionRecord(transaction, evolutionId);
  if (!evolution || evolution.annulledAt) {
    return reject(DAILY_EVOLUTION_REJECTION_MESSAGES.notAvailable);
  }
  return { status: "locked", evolution };
}

// RF-EVO-04, RF-EVO-06, R-03 y CA-10: solo su autor y dentro de la ventana.
function findAuthorChangeRejection(
  evolution: DailyEvolutionRecord,
  actorUserId: string,
  now: Date,
): RejectedOperation | null {
  if (evolution.authorUserId !== actorUserId) {
    return reject(DAILY_EVOLUTION_REJECTION_MESSAGES.notAuthor);
  }
  if (!isWithinEditWindow(evolution, now)) {
    return reject(DAILY_EVOLUTION_REJECTION_MESSAGES.outOfWindow);
  }
  return null;
}

export function updateDailyEvolution(
  actorUserId: string,
  evolutionId: string,
  expectedVersion: string,
  text: string,
): Promise<OperationResult> {
  return runInTransactionAs(actorUserId, async (transaction) => {
    const locked = await lockActiveEvolution(transaction, evolutionId);
    if (locked.status === "rejected") {
      return locked;
    }
    const now = new Date();
    const rejection = findAuthorChangeRejection(
      locked.evolution,
      actorUserId,
      now,
    );
    if (rejection) {
      return rejection;
    }
    if (toVersion(locked.evolution.updatedAt) !== expectedVersion) {
      return reject(DAILY_EVOLUTION_REJECTION_MESSAGES.changedMeanwhile);
    }
    await updateDailyEvolutionText(transaction, evolutionId, text, now);
    return SUCCESS;
  });
}

export function annulDailyEvolution(
  actorUserId: string,
  evolutionId: string,
  reason: string,
): Promise<OperationResult> {
  return runInTransactionAs(actorUserId, async (transaction) => {
    const locked = await lockActiveEvolution(transaction, evolutionId);
    if (locked.status === "rejected") {
      return locked;
    }
    const now = new Date();
    const rejection = findAuthorChangeRejection(
      locked.evolution,
      actorUserId,
      now,
    );
    if (rejection) {
      return rejection;
    }
    await annulDailyEvolutionRecord(transaction, evolutionId, reason, now);
    return SUCCESS;
  });
}

// RF-EVO-05: cualquiera con permiso de crear evoluciones, también fuera de la ventana.
export async function addClarification(
  actorUserId: string,
  evolutionId: string,
  text: string,
): Promise<OperationResult> {
  const signature = await resolveSignature(actorUserId);
  return runInTransactionAs(actorUserId, async (transaction) => {
    const locked = await lockActiveEvolution(transaction, evolutionId);
    if (locked.status === "rejected") {
      return locked;
    }
    await insertClarification(transaction, {
      dailyEvolutionId: evolutionId,
      authorUserId: actorUserId,
      signature,
      text,
      createdAt: new Date(),
    });
    return SUCCESS;
  });
}

export type ClarificationView = {
  id: string;
  authorName: string | null;
  signature: string;
  text: string;
  createdAt: Date;
};

export type DailyEvolutionView = {
  id: string;
  version: string;
  authorUserId: string | null;
  authorName: string | null;
  signature: string;
  text: string;
  registeredAt: Date;
  updatedAt: Date;
  editableUntil: Date;
  clarifications: ClarificationView[];
};

function nameOf(
  userNames: ReadonlyMap<string, string>,
  userId: string | null,
): string | null {
  return userId ? (userNames.get(userId) ?? null) : null;
}

export async function listDailyEvolutions(
  candidateGuestId: string,
): Promise<DailyEvolutionView[]> {
  const parsedGuestId = guestIdSchema.safeParse(candidateGuestId);
  if (!parsedGuestId.success) {
    return [];
  }
  const records = await listActiveDailyEvolutionRecords(parsedGuestId.data);
  const clarifications = await listClarificationRecords(
    records.map(({ id }) => id),
  );
  const userNames = await findUserNames(
    [...records, ...clarifications].flatMap(({ authorUserId }) =>
      authorUserId ? [authorUserId] : [],
    ),
  );
  return records.map((record) => ({
    id: record.id,
    version: toVersion(record.updatedAt),
    authorUserId: record.authorUserId,
    authorName: nameOf(userNames, record.authorUserId),
    signature: record.signature,
    text: record.text,
    registeredAt: record.createdAt,
    updatedAt: record.updatedAt,
    editableUntil: record.editableUntil,
    clarifications: clarifications
      .filter(({ dailyEvolutionId }) => dailyEvolutionId === record.id)
      .map((clarification) => ({
        id: clarification.id,
        authorName: nameOf(userNames, clarification.authorUserId),
        signature: clarification.signature,
        text: clarification.text,
        createdAt: clarification.createdAt,
      })),
  }));
}
