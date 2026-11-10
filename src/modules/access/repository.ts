import { randomUUID } from "node:crypto";

import { and, asc, count, eq, gt, inArray, ne, sql } from "drizzle-orm";

import {
  type DatabaseTransaction,
  getDatabase,
} from "@/platform/database/client";

import {
  accounts,
  invitations,
  rolePermissions,
  roles,
  sessions,
  userRoles,
  users,
} from "./tables";

export const SUPER_USER_SYSTEM_KEY = "super_user";
export const USER_SYSTEM_KEY = "user";
const CREDENTIAL_PROVIDER_ID = "credential";

export async function findUserIdByEmail(email: string): Promise<string | null> {
  const [user] = await getDatabase()
    .select({ id: users.id })
    .from(users)
    .where(eq(users.email, email))
    .limit(1);
  return user?.id ?? null;
}

export async function lockSystemRole(
  transaction: DatabaseTransaction,
  systemKey: string,
): Promise<string | null> {
  const [role] = await transaction
    .select({ id: roles.id })
    .from(roles)
    .where(eq(roles.systemKey, systemKey))
    .for("update");
  return role?.id ?? null;
}

export async function hasUserWithRole(
  transaction: DatabaseTransaction,
  roleId: string,
): Promise<boolean> {
  const [assignment] = await transaction
    .select({ userId: userRoles.userId })
    .from(userRoles)
    .where(eq(userRoles.roleId, roleId))
    .limit(1);
  return assignment !== undefined;
}

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
};

export async function insertUserWithPassword(
  transaction: DatabaseTransaction,
  { name, email, passwordHash, roleId }: NewUserWithPassword,
): Promise<string> {
  const userId = randomUUID();
  await transaction.insert(users).values({ id: userId, name, email });
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

export type UserAccessRecord = {
  roleId: string;
  roleSystemKey: string | null;
  permissions: string[];
};

export async function findUserAccessRecord(
  userId: string,
): Promise<UserAccessRecord | null> {
  const [assignment] = await getDatabase()
    .select({ roleId: roles.id, roleSystemKey: roles.systemKey })
    .from(userRoles)
    .innerJoin(roles, eq(roles.id, userRoles.roleId))
    .where(eq(userRoles.userId, userId))
    .limit(1);
  if (!assignment) {
    return null;
  }
  return {
    ...assignment,
    permissions: await findRolePermissions(getDatabase(), assignment.roleId),
  };
}

async function findRolePermissions(
  database: DatabaseTransaction | ReturnType<typeof getDatabase>,
  roleId: string,
): Promise<string[]> {
  const rows = await database
    .select({ permission: rolePermissions.permission })
    .from(rolePermissions)
    .where(eq(rolePermissions.roleId, roleId));
  return rows.map((row) => row.permission);
}

export type RoleSummary = {
  id: string;
  name: string;
  description: string | null;
  systemKey: string | null;
  userCount: number;
  permissions: string[];
};

export async function listRoles(): Promise<RoleSummary[]> {
  const database = getDatabase();
  const [roleRows, userCounts, permissionRows] = await Promise.all([
    database
      .select({
        id: roles.id,
        name: roles.name,
        description: roles.description,
        systemKey: roles.systemKey,
      })
      .from(roles)
      .orderBy(asc(roles.name)),
    database
      .select({ roleId: userRoles.roleId, userCount: count() })
      .from(userRoles)
      .groupBy(userRoles.roleId),
    database
      .select({
        roleId: rolePermissions.roleId,
        permission: rolePermissions.permission,
      })
      .from(rolePermissions),
  ]);

  return roleRows.map((role) => ({
    ...role,
    userCount:
      userCounts.find((usage) => usage.roleId === role.id)?.userCount ?? 0,
    permissions: permissionRows
      .filter((row) => row.roleId === role.id)
      .map((row) => row.permission),
  }));
}

export type LockedRole = {
  id: string;
  systemKey: string | null;
  permissions: string[];
};

export async function lockRole(
  transaction: DatabaseTransaction,
  roleId: string,
): Promise<LockedRole | null> {
  const [role] = await transaction
    .select({ id: roles.id, systemKey: roles.systemKey })
    .from(roles)
    .where(eq(roles.id, roleId))
    .for("update");
  if (!role) {
    return null;
  }
  return {
    ...role,
    permissions: await findRolePermissions(transaction, role.id),
  };
}

export async function isRoleNameTaken(
  transaction: DatabaseTransaction,
  name: string,
  excludedRoleId: string | null,
): Promise<boolean> {
  const sameName = eq(sql`lower(${roles.name})`, name.toLowerCase());
  const [role] = await transaction
    .select({ id: roles.id })
    .from(roles)
    .where(
      excludedRoleId ? and(sameName, ne(roles.id, excludedRoleId)) : sameName,
    )
    .limit(1);
  return role !== undefined;
}

type RoleDetails = { name: string; description: string | null };

export async function insertRole(
  transaction: DatabaseTransaction,
  details: RoleDetails,
): Promise<string> {
  const [role] = await transaction
    .insert(roles)
    .values(details)
    .returning({ id: roles.id });
  if (!role) {
    throw new Error("No se pudo crear el rol.");
  }
  return role.id;
}

export async function updateRoleDetails(
  transaction: DatabaseTransaction,
  roleId: string,
  details: RoleDetails,
): Promise<void> {
  await transaction
    .update(roles)
    .set({ ...details, updatedAt: new Date() })
    .where(eq(roles.id, roleId));
}

export async function addRolePermissions(
  transaction: DatabaseTransaction,
  roleId: string,
  permissions: string[],
): Promise<void> {
  if (permissions.length === 0) {
    return;
  }
  await transaction
    .insert(rolePermissions)
    .values(permissions.map((permission) => ({ roleId, permission })));
}

export async function removeRolePermissions(
  transaction: DatabaseTransaction,
  roleId: string,
  permissions: string[],
): Promise<void> {
  if (permissions.length === 0) {
    return;
  }
  await transaction
    .delete(rolePermissions)
    .where(
      and(
        eq(rolePermissions.roleId, roleId),
        inArray(rolePermissions.permission, permissions),
      ),
    );
}

export async function deleteRole(
  transaction: DatabaseTransaction,
  roleId: string,
): Promise<void> {
  await transaction.delete(roles).where(eq(roles.id, roleId));
}

export async function hasInvitationWithRole(
  transaction: DatabaseTransaction,
  roleId: string,
): Promise<boolean> {
  const [invitation] = await transaction
    .select({ id: invitations.id })
    .from(invitations)
    .where(eq(invitations.roleId, roleId))
    .limit(1);
  return invitation !== undefined;
}

export type AccessRevocationRecord = {
  accessRevokedAt: Date | null;
  accessRevokedUntil: Date | null;
};

export async function findAccessRevocation(
  userId: string,
): Promise<AccessRevocationRecord | null> {
  const [user] = await getDatabase()
    .select({
      accessRevokedAt: users.accessRevokedAt,
      accessRevokedUntil: users.accessRevokedUntil,
    })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);
  return user ?? null;
}

export type LockedUser = AccessRevocationRecord & {
  id: string;
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

export type RoleOption = { id: string; name: string };
