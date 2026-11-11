import { and, asc, count, eq, inArray, ne, sql } from "drizzle-orm";

import {
  type DatabaseTransaction,
  getDatabase,
} from "@/platform/database/client";

import { findRolePermissions } from "../authorization/repository";
import { invitations, rolePermissions, roles, userRoles } from "../tables";

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

export type RoleOption = { id: string; name: string };
