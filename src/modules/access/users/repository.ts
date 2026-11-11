import { and, eq, gt } from "drizzle-orm";

import { randomUUID } from "node:crypto";

import {
  type DatabaseTransaction,
  getDatabase,
} from "@/platform/database/client";

import type { AccessRevocationRecord } from "../auth/repository";
import {
  accounts,
  invitations,
  roles,
  sessions,
  userRoles,
  users,
} from "../tables";

const CREDENTIAL_PROVIDER_ID = "credential";

export async function isEmailRegistered(
  transaction: DatabaseTransaction,
  email: string,
): Promise<boolean> {
  const [user] = await transaction
    .select({ id: users.id })
    .from(users)
    .where(eq(users.email, email))
    .limit(1);
  return user !== undefined;
}

type NewUserWithPassword = {
  name: string;
  email: string;
  passwordHash: string;
  roleId: string;
  emailVerified?: boolean;
};

export async function insertUserWithPassword(
  transaction: DatabaseTransaction,
  { name, email, passwordHash, roleId, emailVerified }: NewUserWithPassword,
): Promise<string> {
  const userId = randomUUID();
  await transaction
    .insert(users)
    .values({ id: userId, name, email, emailVerified });
  await transaction.insert(accounts).values({
    id: randomUUID(),
    accountId: userId,
    providerId: CREDENTIAL_PROVIDER_ID,
    userId,
    password: passwordHash,
  });
  await transaction.insert(userRoles).values({ userId, roleId });
  return userId;
}

export type LockedUser = AccessRevocationRecord & {
  id: string;
  roleId: string | null;
  roleSystemKey: string | null;
};

export async function lockUser(
  transaction: DatabaseTransaction,
  userId: string,
): Promise<LockedUser | null> {
  const [user] = await transaction
    .select({
      id: users.id,
      accessRevokedAt: users.accessRevokedAt,
      accessRevokedUntil: users.accessRevokedUntil,
      roleId: userRoles.roleId,
      roleSystemKey: roles.systemKey,
    })
    .from(users)
    .leftJoin(userRoles, eq(userRoles.userId, users.id))
    .leftJoin(roles, eq(roles.id, userRoles.roleId))
    .where(eq(users.id, userId))
    .for("update", { of: users });
  return user ?? null;
}

type AccessRevocationChange = {
  revokedAt: Date;
  revokedUntil: Date | null;
  reason: string;
  revokedByUserId: string;
};

export async function updateAccessRevocation(
  transaction: DatabaseTransaction,
  userId: string,
  change: AccessRevocationChange | null,
): Promise<void> {
  await transaction
    .update(users)
    .set({
      accessRevokedAt: change?.revokedAt ?? null,
      accessRevokedUntil: change?.revokedUntil ?? null,
      accessRevocationReason: change?.reason ?? null,
      accessRevokedByUserId: change?.revokedByUserId ?? null,
      updatedAt: new Date(),
    })
    .where(eq(users.id, userId));
}

export async function deleteUserSessions(
  transaction: DatabaseTransaction,
  userId: string,
): Promise<void> {
  await transaction.delete(sessions).where(eq(sessions.userId, userId));
}

export type UserSummary = AccessRevocationRecord & {
  id: string;
  name: string;
  email: string;
  emailVerified: boolean;
  twoFactorEnabled: boolean;
  accessRevocationReason: string | null;
  roleId: string | null;
  roleName: string | null;
  roleSystemKey: string | null;
};

export async function listUsers(): Promise<UserSummary[]> {
  return getDatabase()
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
      emailVerified: users.emailVerified,
      twoFactorEnabled: users.twoFactorEnabled,
      accessRevokedAt: users.accessRevokedAt,
      accessRevokedUntil: users.accessRevokedUntil,
      accessRevocationReason: users.accessRevocationReason,
      roleId: roles.id,
      roleName: roles.name,
      roleSystemKey: roles.systemKey,
    })
    .from(users)
    .leftJoin(userRoles, eq(userRoles.userId, users.id))
    .leftJoin(roles, eq(roles.id, userRoles.roleId));
}

export async function hasPendingInvitation(
  transaction: DatabaseTransaction,
  email: string,
  now: Date,
): Promise<boolean> {
  const [invitation] = await transaction
    .select({ id: invitations.id })
    .from(invitations)
    .where(
      and(
        eq(invitations.email, email),
        eq(invitations.status, "pending"),
        gt(invitations.expiresAt, now),
      ),
    )
    .limit(1);
  return invitation !== undefined;
}

export async function updateUserRole(
  transaction: DatabaseTransaction,
  userId: string,
  roleId: string,
): Promise<void> {
  await transaction
    .update(userRoles)
    .set({ roleId, updatedAt: new Date() })
    .where(eq(userRoles.userId, userId));
}
