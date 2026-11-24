import { findSigner, findUserNames } from "@/modules/access";
import { findActiveProfessionalSpecialty } from "@/modules/catalogs";
import { guestIdSchema, lockGuestForClinicalChange } from "@/modules/guests";
import {
  computeEditableUntil,
  getDailyEvolutionEditWindow,
} from "@/modules/settings";
import { runInTransactionAs } from "@/platform/database/client";
import { type OperationResult, SUCCESS } from "@/platform/operation-result";

import { insertDailyEvolution, listDailyEvolutionRecords } from "./repository";

// RF-EVO-03 y CA-09: la especialidad del profesional activo con el mismo correo; si no la hay, el rol.
export async function resolveSignature(userId: string): Promise<string> {
  const signer = await findSigner(userId);
  if (!signer?.roleName) {
    throw new Error("La persona que registra no tiene un rol asignado.");
  }
  const specialty = await findActiveProfessionalSpecialty(signer.email);
  return specialty ?? signer.roleName;
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

export type DailyEvolutionView = {
  id: string;
  authorName: string | null;
  signature: string;
  text: string;
  registeredAt: Date;
};

export async function listDailyEvolutions(
  candidateGuestId: string,
): Promise<DailyEvolutionView[]> {
  const parsedGuestId = guestIdSchema.safeParse(candidateGuestId);
  if (!parsedGuestId.success) {
    return [];
  }
  const records = await listDailyEvolutionRecords(parsedGuestId.data);
  const userNames = await findUserNames(
    records.flatMap(({ authorUserId }) => (authorUserId ? [authorUserId] : [])),
  );
  return records.map((record) => ({
    id: record.id,
    authorName: record.authorUserId
      ? (userNames.get(record.authorUserId) ?? null)
      : null,
    signature: record.signature,
    text: record.text,
    registeredAt: record.createdAt,
  }));
}
