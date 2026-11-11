import { createHmac } from "node:crypto";

import { hashPassword } from "better-auth/crypto";
import { sql } from "drizzle-orm";

import { getDatabase, runInTransaction } from "@/platform/database/client";

import type { Permission } from "./permissions";
import { insertUserWithPassword } from "./users/repository";
import { assignRolePermissions, createRole, listRoles } from "./roles/service";
import { createFirstSuperUser } from "./users/service";
import { getUserAccess, type UserAccess } from "./authorization/service";

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

const TOTP_PERIOD_SECONDS = 30;
const TOTP_DIGITS = 6;
const BASE32_ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";

function decodeBase32(encoded: string): Buffer {
  let bits = "";
  for (const character of encoded.replace(/[\s=]+/g, "")) {
    bits += BASE32_ALPHABET.indexOf(character).toString(2).padStart(5, "0");
  }
  const bytes = bits.match(/.{8}/g) ?? [];
  return Buffer.from(bytes.map((byte) => Number.parseInt(byte, 2)));
}

// RFC 6238, independiente de Better Auth: es lo que calcula una aplicación autenticadora.
export function generateTotpCode(base32Secret: string): string {
  const counter = Buffer.alloc(8);
  counter.writeBigUInt64BE(
    BigInt(Math.floor(Date.now() / 1000 / TOTP_PERIOD_SECONDS)),
  );
  const digest = createHmac("sha1", decodeBase32(base32Secret))
    .update(counter)
    .digest();
  const offset = (digest.at(-1) ?? 0) & 0x0f;
  const binary = digest.readUInt32BE(offset) & 0x7fffffff;
  return String(binary % 10 ** TOTP_DIGITS).padStart(TOTP_DIGITS, "0");
}
