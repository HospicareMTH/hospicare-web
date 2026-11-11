import { createHash, randomBytes } from "node:crypto";

import { expect, type Page } from "@playwright/test";
import { hashPassword } from "better-auth/crypto";
import { eq } from "drizzle-orm";

import type { Permission } from "../src/modules/access";
import { findUserIdByEmail } from "../src/modules/access/auth/repository";
import { insertInvitation } from "../src/modules/access/invitations/repository";
import { insertUserWithPassword } from "../src/modules/access/users/repository";
import {
  assignRolePermissions,
  createRole,
  listRoles,
} from "../src/modules/access/roles/service";
import { getUserAccess } from "../src/modules/access/authorization/service";
import { users, verifications } from "../src/modules/access/tables";
import { getDatabase, runInTransaction } from "../src/platform/database/client";

export const FICTITIOUS_SUPER_USER = {
  name: "Ana Prueba",
  email: "ana.prueba@hospicare.test",
  password: "clave-de-prueba-larga",
};

export async function signIn(
  page: Page,
  password = FICTITIOUS_SUPER_USER.password,
  email = FICTITIOUS_SUPER_USER.email,
) {
  await page
    .getByRole("textbox", { name: "Correo electrónico", exact: true })
    .fill(email);
  await page
    .getByRole("textbox", { name: "Contraseña", exact: true })
    .fill(password);
  await page.getByRole("button", { name: "Ingresar" }).click();
}

export async function signInFromHome(page: Page) {
  await page.goto("/");
  await signIn(page);
  await expect(
    page.getByRole("heading", { level: 1, name: "Inicio" }),
  ).toBeVisible();
}

async function getSuperUserAccess() {
  const superUserId = await findUserIdByEmail(FICTITIOUS_SUPER_USER.email);
  if (!superUserId) {
    throw new Error("Falta el Super user ficticio en la base de pruebas.");
  }
  return getUserAccess(superUserId);
}

export async function findRoleId(name: string): Promise<string> {
  const role = (await listRoles()).find((candidate) => candidate.name === name);
  if (!role) {
    throw new Error(`No existe el rol de prueba ${name}.`);
  }
  return role.id;
}

export async function createFictitiousUser(email: string, roleId: string) {
  const passwordHash = await hashPassword(FICTITIOUS_SUPER_USER.password);
  await runInTransaction((transaction) =>
    insertUserWithPassword(transaction, {
      name: "Persona Ficticia",
      email,
      passwordHash,
      roleId,
    }),
  );
}

export async function createRoleWithPermissions(
  name: string,
  permissions: Permission[],
): Promise<string> {
  const superUser = await getSuperUserAccess();
  await createRole(superUser, { name, description: null });
  const roleId = await findRoleId(name);
  await assignRolePermissions(superUser, roleId, permissions);
  return roleId;
}

export async function assignPermissions(
  roleId: string,
  permissions: Permission[],
) {
  await assignRolePermissions(await getSuperUserAccess(), roleId, permissions);
}

const INVITATION_VALIDITY_MILLISECONDS = 7 * 86_400_000;

export async function createInvitationWithKnownToken(
  name: string,
  email: string,
): Promise<string> {
  const superUser = await getSuperUserAccess();
  const token = randomBytes(32).toString("base64url");
  const roleId = await findRoleId("Usuario");
  await runInTransaction((transaction) =>
    insertInvitation(transaction, {
      name,
      email,
      roleId,
      tokenHash: createHash("sha256").update(token).digest("hex"),
      expiresAt: new Date(Date.now() + INVITATION_VALIDITY_MILLISECONDS),
      invitedByUserId: superUser.userId,
    }),
  );
  return token;
}

const PASSWORD_RESET_VALIDITY_MILLISECONDS = 30 * 60_000;

// Replica el hash "hashed" de Better Auth para crear un enlace de recuperación conocido.
export async function createPasswordResetLink(email: string): Promise<string> {
  const userId = await findUserIdByEmail(email);
  if (!userId) {
    throw new Error("Falta el usuario ficticio en la base de pruebas.");
  }
  const token = randomBytes(24).toString("base64url");
  await getDatabase()
    .insert(verifications)
    .values({
      id: randomBytes(16).toString("hex"),
      identifier: createHash("sha256")
        .update(`reset-password:${token}`)
        .digest("base64url"),
      value: userId,
      expiresAt: new Date(Date.now() + PASSWORD_RESET_VALIDITY_MILLISECONDS),
    });
  return `/api/auth/reset-password/${token}?callbackURL=%2Frestablecer-contrasena`;
}

export async function markEmailVerified(email: string) {
  await getDatabase()
    .update(users)
    .set({ emailVerified: true })
    .where(eq(users.email, email));
}
