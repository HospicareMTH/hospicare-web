import { createHash, randomBytes } from "node:crypto";

import { hashPassword } from "better-auth/crypto";
import { z } from "zod";

import {
  type Comparator,
  compareText,
  type ListPage,
  type ListQuery,
  paginateList,
} from "@/platform/list-query";
import {
  type OperationResult,
  reject,
  type RejectedOperation,
  SUCCESS,
} from "@/platform/operation-result";
import {
  runInTransaction,
  runInTransactionAs,
  setTransactionActor,
} from "@/platform/database/client";
import { sendMail } from "@/platform/mail";

import { INVITATION_ACCEPTANCE_PATH } from "../routes";
import type {
  InvitationListQuery,
  InvitationSortKey,
  InvitationState,
  ValidInvitationInput,
} from "./schemas";
import {
  findInvitationByTokenHash,
  insertInvitation,
  type InvitationSummary,
  listInvitations as listInvitationRecords,
  type LockedInvitation,
  lockInvitation,
  lockInvitationByTokenHash,
  markInvitationAccepted,
  markInvitationRevoked,
} from "./repository";
import { MILLISECONDS_PER_DAY } from "../users/service";
import { SUPER_USER_SYSTEM_KEY } from "../authorization/repository";
import type { UserAccess } from "../authorization/service";
import { canGrantRole } from "../roles/service";
import {
  hasPendingInvitation,
  insertUserWithPassword,
  isEmailRegistered,
} from "../users/repository";
import { lockRole } from "../roles/repository";

const INVITATION_VALIDITY_DAYS = 7;

const INVITATION_TOKEN_BYTES = 32;

const INVITATION_TOKEN_PARAMETER = "token";

const applicationUrlSchema = z.url({
  error: "BETTER_AUTH_URL debe ser una URL.",
});

function hashInvitationToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

function buildInvitationUrl(token: string): string {
  const url = new URL(
    INVITATION_ACCEPTANCE_PATH,
    applicationUrlSchema.parse(process.env.BETTER_AUTH_URL),
  );
  url.searchParams.set(INVITATION_TOKEN_PARAMETER, token);
  return url.toString();
}

export function getInvitationState(
  invitation: Pick<LockedInvitation, "status" | "expiresAt">,
  now: Date,
): InvitationState {
  if (invitation.status === "pending" && invitation.expiresAt <= now) {
    return "expired";
  }
  return invitation.status;
}

export const INVITATION_REJECTION_MESSAGES = {
  roleNotFound: "El rol elegido ya no existe. Actualizá la pantalla.",
  superUserRoleOnly: "Solo un Super user puede invitar con el rol Super user.",
  roleNotAllowed: "Solo podés invitar con un rol cuyos permisos tengas.",
  emailRegistered: "Ese correo ya tiene una cuenta.",
  invitationPending: "Ese correo ya tiene una invitación pendiente.",
  mailFailed:
    "No pudimos enviar el correo, así que la invitación quedó revocada. Probá de nuevo en unos minutos.",
  invitationNotFound: "La invitación ya no existe. Actualizá la pantalla.",
  invitationNotPending: "Solo se pueden revocar invitaciones pendientes.",
  invalidLink:
    "Este enlace ya no es válido. Pedile una nueva invitación a un administrador.",
} as const;

type CreatedInvitation =
  { status: "created"; invitationId: string } | RejectedOperation;

function insertCheckedInvitation(
  actor: UserAccess,
  input: ValidInvitationInput,
  tokenHash: string,
): Promise<CreatedInvitation> {
  return runInTransactionAs(actor.userId, async (transaction) => {
    const now = new Date();
    const role = await lockRole(transaction, input.roleId);
    if (!role) {
      return reject(INVITATION_REJECTION_MESSAGES.roleNotFound);
    }
    if (role.systemKey === SUPER_USER_SYSTEM_KEY && !actor.isSuperUser) {
      return reject(INVITATION_REJECTION_MESSAGES.superUserRoleOnly);
    }
    if (!canGrantRole(actor, role)) {
      return reject(INVITATION_REJECTION_MESSAGES.roleNotAllowed);
    }
    if (await isEmailRegistered(transaction, input.email)) {
      return reject(INVITATION_REJECTION_MESSAGES.emailRegistered);
    }
    if (await hasPendingInvitation(transaction, input.email, now)) {
      return reject(INVITATION_REJECTION_MESSAGES.invitationPending);
    }
    const invitationId = await insertInvitation(transaction, {
      ...input,
      tokenHash,
      expiresAt: new Date(
        now.getTime() + INVITATION_VALIDITY_DAYS * MILLISECONDS_PER_DAY,
      ),
      invitedByUserId: actor.userId,
    });
    return { status: "created", invitationId };
  });
}

export async function createInvitation(
  actor: UserAccess,
  input: ValidInvitationInput,
): Promise<OperationResult> {
  const token = randomBytes(INVITATION_TOKEN_BYTES).toString("base64url");
  const created = await insertCheckedInvitation(
    actor,
    input,
    hashInvitationToken(token),
  );
  if (created.status === "rejected") {
    return created;
  }

  const invitationUrl = buildInvitationUrl(token);
  try {
    await sendMail({
      to: input.email,
      subject: "Te invitaron a Hospicare",
      text: `Hola ${input.name}: el equipo del Hospice Madre Teresa te dio acceso a Hospicare. Creá tu contraseña desde este enlace, que vence en ${INVITATION_VALIDITY_DAYS} días: ${invitationUrl}`,
      actionUrl: invitationUrl,
    });
  } catch (error) {
    console.error("No se pudo enviar el correo de invitación.", error);
    await runInTransactionAs(actor.userId, (transaction) =>
      markInvitationRevoked(transaction, created.invitationId, null),
    );
    return reject(INVITATION_REJECTION_MESSAGES.mailFailed);
  }
  return SUCCESS;
}

export async function revokeInvitation(
  actor: UserAccess,
  invitationId: string,
): Promise<OperationResult> {
  return runInTransactionAs(actor.userId, async (transaction) => {
    const invitation = await lockInvitation(transaction, invitationId);
    if (!invitation) {
      return reject(INVITATION_REJECTION_MESSAGES.invitationNotFound);
    }
    if (getInvitationState(invitation, new Date()) !== "pending") {
      return reject(INVITATION_REJECTION_MESSAGES.invitationNotPending);
    }
    await markInvitationRevoked(transaction, invitationId, actor.userId);
    return SUCCESS;
  });
}

export type InvitationListItem = {
  id: string;
  name: string;
  email: string;
  roleName: string;
  state: InvitationState;
  createdAt: Date;
  expiresAt: Date;
};

function toInvitationListItem(
  invitation: InvitationSummary,
  now: Date,
): InvitationListItem {
  return {
    id: invitation.id,
    name: invitation.name,
    email: invitation.email,
    roleName: invitation.roleName,
    state: getInvitationState(invitation, now),
    createdAt: invitation.createdAt,
    expiresAt: invitation.expiresAt,
  };
}

const INVITATION_COMPARATORS: Record<
  InvitationSortKey,
  Comparator<InvitationListItem>
> = {
  createdAt: (first, second) =>
    first.createdAt.getTime() - second.createdAt.getTime(),
  name: (first, second) => compareText(first.name, second.name),
  expiresAt: (first, second) =>
    first.expiresAt.getTime() - second.expiresAt.getTime(),
};

export async function searchInvitations({
  state,
  roleId,
  ...query
}: InvitationListQuery): Promise<ListPage<InvitationListItem>> {
  const now = new Date();
  const invitations = (await listInvitationRecords())
    .filter((invitation) => roleId === null || invitation.roleId === roleId)
    .map((invitation) => toInvitationListItem(invitation, now))
    .filter((invitation) => state === null || invitation.state === state);
  return paginateList(
    invitations,
    query satisfies ListQuery<InvitationSortKey>,
    (invitation) =>
      `${invitation.name} ${invitation.email} ${invitation.roleName}`,
    INVITATION_COMPARATORS,
  );
}

export type InvitationPreview =
  | { status: "valid"; name: string; email: string; roleName: string }
  | { status: "invalid" };

export async function previewInvitation(
  token: string,
): Promise<InvitationPreview> {
  const invitation = await findInvitationByTokenHash(
    hashInvitationToken(token),
  );
  if (!invitation || getInvitationState(invitation, new Date()) !== "pending") {
    return { status: "invalid" };
  }
  return {
    status: "valid",
    name: invitation.name,
    email: invitation.email,
    roleName: invitation.roleName,
  };
}

export async function acceptInvitation(
  token: string,
  password: string,
): Promise<OperationResult> {
  if ((await previewInvitation(token)).status === "invalid") {
    return reject(INVITATION_REJECTION_MESSAGES.invalidLink);
  }
  const passwordHash = await hashPassword(password);
  return runInTransaction(async (transaction) => {
    const invitation = await lockInvitationByTokenHash(
      transaction,
      hashInvitationToken(token),
    );
    if (
      !invitation ||
      getInvitationState(invitation, new Date()) !== "pending" ||
      (await isEmailRegistered(transaction, invitation.email))
    ) {
      return reject(INVITATION_REJECTION_MESSAGES.invalidLink);
    }

    const userId = await insertUserWithPassword(transaction, {
      name: invitation.name,
      email: invitation.email,
      passwordHash,
      roleId: invitation.roleId,
    });
    await setTransactionActor(transaction, userId);
    await markInvitationAccepted(transaction, invitation.id, userId);
    return SUCCESS;
  });
}
