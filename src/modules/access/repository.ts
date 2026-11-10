import { randomUUID } from "node:crypto";

import { eq } from "drizzle-orm";

import {
  type DatabaseTransaction,
  getDatabase,
} from "@/platform/database/client";

import { accounts, roles, userRoles, users } from "./tables";

export const SUPER_USER_SYSTEM_KEY = "super_user";
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
