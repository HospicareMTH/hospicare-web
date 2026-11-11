import { eq } from "drizzle-orm";

import {
  type DatabaseTransaction,
  getDatabase,
} from "@/platform/database/client";

import { rolePermissions, roles, userRoles } from "../tables";

export const SUPER_USER_SYSTEM_KEY = "super_user";

export const USER_SYSTEM_KEY = "user";

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

export async function findRolePermissions(
  database: DatabaseTransaction | ReturnType<typeof getDatabase>,
  roleId: string,
): Promise<string[]> {
  const rows = await database
    .select({ permission: rolePermissions.permission })
    .from(rolePermissions)
    .where(eq(rolePermissions.roleId, roleId));
  return rows.map((row) => row.permission);
}
