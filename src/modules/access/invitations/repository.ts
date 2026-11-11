import { eq } from "drizzle-orm";

import {
  type DatabaseTransaction,
  getDatabase,
} from "@/platform/database/client";

import { invitations, roles } from "../tables";

type NewInvitation = {
  name: string;
  email: string;
  roleId: string;
  tokenHash: string;
  expiresAt: Date;
  invitedByUserId: string;
};

export async function insertInvitation(
  transaction: DatabaseTransaction,
  invitation: NewInvitation,
): Promise<string> {
  const [inserted] = await transaction
    .insert(invitations)
    .values(invitation)
    .returning({ id: invitations.id });
  if (!inserted) {
    throw new Error("No se pudo crear la invitación.");
  }
  return inserted.id;
}

export type LockedInvitation = {
  id: string;
  name: string;
  email: string;
  roleId: string;
  status: "pending" | "accepted" | "revoked";
  expiresAt: Date;
};

const invitationColumns = {
  id: invitations.id,
  name: invitations.name,
  email: invitations.email,
  roleId: invitations.roleId,
  status: invitations.status,
  expiresAt: invitations.expiresAt,
};

export async function lockInvitation(
  transaction: DatabaseTransaction,
  invitationId: string,
): Promise<LockedInvitation | null> {
  const [invitation] = await transaction
    .select(invitationColumns)
    .from(invitations)
    .where(eq(invitations.id, invitationId))
    .for("update");
  return invitation ?? null;
}

export async function lockInvitationByTokenHash(
  transaction: DatabaseTransaction,
  tokenHash: string,
): Promise<LockedInvitation | null> {
  const [invitation] = await transaction
    .select(invitationColumns)
    .from(invitations)
    .where(eq(invitations.tokenHash, tokenHash))
    .for("update");
  return invitation ?? null;
}

export type InvitationPreview = LockedInvitation & { roleName: string };

export async function findInvitationByTokenHash(
  tokenHash: string,
): Promise<InvitationPreview | null> {
  const [invitation] = await getDatabase()
    .select({ ...invitationColumns, roleName: roles.name })
    .from(invitations)
    .innerJoin(roles, eq(roles.id, invitations.roleId))
    .where(eq(invitations.tokenHash, tokenHash))
    .limit(1);
  return invitation ?? null;
}

export async function markInvitationAccepted(
  transaction: DatabaseTransaction,
  invitationId: string,
  acceptedUserId: string,
): Promise<void> {
  await transaction
    .update(invitations)
    .set({ status: "accepted", acceptedUserId, updatedAt: new Date() })
    .where(eq(invitations.id, invitationId));
}

export async function markInvitationRevoked(
  transaction: DatabaseTransaction,
  invitationId: string,
  revokedByUserId: string | null,
): Promise<void> {
  const now = new Date();
  await transaction
    .update(invitations)
    .set({ status: "revoked", revokedAt: now, revokedByUserId, updatedAt: now })
    .where(eq(invitations.id, invitationId));
}

export type InvitationSummary = InvitationPreview & { createdAt: Date };

export async function listInvitations(): Promise<InvitationSummary[]> {
  return getDatabase()
    .select({
      ...invitationColumns,
      roleName: roles.name,
      createdAt: invitations.createdAt,
    })
    .from(invitations)
    .innerJoin(roles, eq(roles.id, invitations.roleId));
}
