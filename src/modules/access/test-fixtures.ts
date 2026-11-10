import { hashPassword } from "better-auth/crypto";
import { sql } from "drizzle-orm";

import { getDatabase, runInTransaction } from "@/platform/database/client";

import type { Permission } from "./permissions";
import { insertUserWithPassword } from "./repository";
import {
  assignRolePermissions,
  createFirstSuperUser,
  createRole,
  getUserAccess,
  listRoles,
  type UserAccess,
} from "./service";

export const FICTITIOUS_PASSWORD = "clave-de-prueba-larga";
export const FICTITIOUS_SUPER_USER = {
  name: "Ana Prueba",
  email: "ana.prueba@hospicare.test",
  password: FICTITIOUS_PASSWORD,
};

export async function findUserId(email: string): Promise<string> {
  const result = await getDatabase().execute<{ id: string }>(
    sql`select id from users where email = ${email}`,
  );
  const [user] = result.rows;
  if (!user) {
    throw new Error("No se creó el usuario de prueba.");
  }
  return user.id;
}

export async function findRoleId(name: string): Promise<string> {
  const role = (await listRoles()).find((candidate) => candidate.name === name);
  if (!role) {
    throw new Error(`No existe el rol de prueba ${name}.`);
  }
  return role.id;
}

export async function createSuperUserAccess(): Promise<UserAccess> {
  await createFirstSuperUser(FICTITIOUS_SUPER_USER);
  return getUserAccess(await findUserId(FICTITIOUS_SUPER_USER.email));
}

export async function createUserWithRole(
  email: string,
  roleId: string,
): Promise<UserAccess> {
  const passwordHash = await hashPassword(FICTITIOUS_PASSWORD);
  const userId = await runInTransaction((transaction) =>
    insertUserWithPassword(transaction, {
      name: "Persona Ficticia",
      email,
      passwordHash,
      roleId,
    }),
  );
  return getUserAccess(userId);
}

export async function createRoleWithPermissions(
  superUser: UserAccess,
  name: string,
  permissions: Permission[],
): Promise<string> {
  await createRole(superUser, { name, description: null });
  const roleId = await findRoleId(name);
  await assignRolePermissions(superUser, roleId, permissions);
  return roleId;
}
