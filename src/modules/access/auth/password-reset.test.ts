// @vitest-environment node

import { sql } from "drizzle-orm";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { getDatabase } from "@/platform/database/client";
import { resetTestDatabase } from "@/platform/database/test-database";
import type { MailMessage } from "@/platform/mail";

import { getAuth } from "./auth";
import { PASSWORD_RESET_PATH } from "../routes";
import { revokeUserAccess } from "../users/service";
import type { UserAccess } from "../authorization/service";
import {
  createSuperUserAccess,
  createUserWithRole,
  FICTITIOUS_PASSWORD,
  findRoleId,
} from "../test-fixtures";

const sentMails = vi.hoisted(() => ({ messages: [] as MailMessage[] }));
const mailFailure = vi.hoisted(() => ({ shouldFail: false }));

vi.mock("@/platform/mail", () => ({
  sendMail: async (message: MailMessage) => {
    if (mailFailure.shouldFail) {
      throw new Error("Servicio de correo caído en la prueba.");
    }
    sentMails.messages.push(message);
  },
}));

const PERSON_EMAIL = "lucia.ficticia@hospicare.test";
const NEW_PASSWORD = "otra-clave-de-prueba-larga";
const PASSWORD_RESET_ATTEMPTS_ALLOWED = 5;
const PASSWORD_RESET_VALIDITY_MILLISECONDS = 30 * 60 * 1000;
const TOLERANCE_MILLISECONDS = 60 * 1000;

function getBaseUrl(): string {
  const baseUrl = process.env.BETTER_AUTH_URL;
  if (!baseUrl) {
    throw new Error("Falta BETTER_AUTH_URL en .env.test.local.");
  }
  return baseUrl;
}

function postToAuth(path: string, body: object) {
  return getAuth().handler(
    new Request(`${getBaseUrl()}/api/auth${path}`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        origin: getBaseUrl(),
        "cf-connecting-ip": "203.0.113.20",
      },
      body: JSON.stringify(body),
    }),
  );
}

function requestPasswordReset(email: string) {
  return postToAuth("/request-password-reset", {
    email,
    redirectTo: PASSWORD_RESET_PATH,
  });
}

function resetPassword(token: string, newPassword: string) {
  return postToAuth("/reset-password", { token, newPassword });
}

function signIn(password: string) {
  return postToAuth("/sign-in/email", { email: PERSON_EMAIL, password });
}

function lastResetToken(): string {
  const message = sentMails.messages.at(-1);
  if (!message || !("actionUrl" in message)) {
    throw new Error("No se envió el correo de recuperación.");
  }
  const token = new URL(message.actionUrl).pathname.split("/").at(-1);
  if (!token) {
    throw new Error("El correo no trae el enlace de recuperación.");
  }
  return token;
}

async function countSessions(userId: string): Promise<number> {
  const result = await getDatabase().execute<{ count: string }>(
    sql`select count(*) as count from sessions where user_id = ${userId}`,
  );
  return Number(result.rows[0]?.count);
}

describe("recuperación de contraseña", () => {
  let superUser: UserAccess;
  let person: UserAccess;

  beforeEach(async () => {
    await resetTestDatabase();
    sentMails.messages = [];
    mailFailure.shouldFail = false;
    superUser = await createSuperUserAccess();
    person = await createUserWithRole(
      PERSON_EMAIL,
      await findRoleId("Usuario"),
    );
  });

  it("RF-ACC-05, 8.5: envía el enlace y permite entrar con la contraseña nueva", async () => {
    const response = await requestPasswordReset(PERSON_EMAIL);

    expect(response.status).toBe(200);
    expect(sentMails.messages).toHaveLength(1);
    expect(sentMails.messages[0]?.to).toBe(PERSON_EMAIL);

    const resetResponse = await resetPassword(lastResetToken(), NEW_PASSWORD);
    expect(resetResponse.status).toBe(200);
    expect((await signIn(FICTITIOUS_PASSWORD)).status).toBe(401);
    expect((await signIn(NEW_PASSWORD)).status).toBe(200);
  });

  it("RF-ACC-05: el enlace vence a los 30 minutos y se guarda con hash", async () => {
    const requestedAt = Date.now();
    await requestPasswordReset(PERSON_EMAIL);
    const token = lastResetToken();

    const result = await getDatabase().execute<{
      identifier: string;
      expires_at: Date;
    }>(sql`select identifier, expires_at from verifications`);
    const [verification] = result.rows;
    expect(verification?.identifier).not.toContain(token);
    const validity =
      new Date(verification?.expires_at ?? 0).getTime() - requestedAt;
    expect(
      Math.abs(validity - PASSWORD_RESET_VALIDITY_MILLISECONDS),
    ).toBeLessThan(TOLERANCE_MILLISECONDS);
  });

  it("RF-ACC-05: el enlace sirve una sola vez", async () => {
    await requestPasswordReset(PERSON_EMAIL);
    const token = lastResetToken();

    expect((await resetPassword(token, NEW_PASSWORD)).status).toBe(200);
    expect((await resetPassword(token, NEW_PASSWORD)).status).toBe(400);
  });

  it("RF-ACC-05: al restablecer cierra todas las sesiones", async () => {
    await signIn(FICTITIOUS_PASSWORD);
    await signIn(FICTITIOUS_PASSWORD);
    expect(await countSessions(person.userId)).toBe(2);

    await requestPasswordReset(PERSON_EMAIL);
    await resetPassword(lastResetToken(), NEW_PASSWORD);

    expect(await countSessions(person.userId)).toBe(0);
  });

  it("RN-20, 8.5: registra la contraseña restablecida sin el hash", async () => {
    await requestPasswordReset(PERSON_EMAIL);
    await resetPassword(lastResetToken(), NEW_PASSWORD);

    const result = await getDatabase().execute<{
      operation: string;
      actor_user_id: string | null;
      target_user_id: string | null;
      status: string;
    }>(sql`
      select operation, actor_user_id, target_user_id, status
      from audit_log where action = 'user.password_updated'
    `);
    expect(result.rows).toEqual([
      {
        operation: "security",
        actor_user_id: person.userId,
        target_user_id: person.userId,
        status: "success",
      },
    ]);
    const accountChanges = await getDatabase().execute<{ entry: string }>(sql`
      select concat(previous_value, new_value) as entry
      from audit_log where action = 'account.updated'
    `);
    expect(accountChanges.rows.length).toBeGreaterThan(0);
    for (const { entry } of accountChanges.rows) {
      expect(entry).not.toContain("password");
    }
  });

  it("RF-ACC-04: rechaza una contraseña nueva corta", async () => {
    await requestPasswordReset(PERSON_EMAIL);

    const response = await resetPassword(lastResetToken(), "corta");

    expect(response.status).toBe(400);
    expect((await signIn(FICTITIOUS_PASSWORD)).status).toBe(200);
  });

  it("RF-ACC-01: responde igual ante un correo sin cuenta y no envía nada", async () => {
    const response = await requestPasswordReset("nadie@hospicare.test");

    expect(response.status).toBe(200);
    expect(sentMails.messages).toHaveLength(0);
  });

  it("RF-ACC-18: no envía el enlace a una cuenta con acceso revocado", async () => {
    await revokeUserAccess(superUser, person.userId, {
      duration: { kind: "permanent" },
      reason: "Prueba de revocación",
    });

    const response = await requestPasswordReset(PERSON_EMAIL);

    expect(response.status).toBe(200);
    expect(sentMails.messages).toHaveLength(0);
  });

  it("RF-ACC-05: si falla el correo responde igual, sin revelar la cuenta", async () => {
    mailFailure.shouldFail = true;

    const response = await requestPasswordReset(PERSON_EMAIL);

    expect(response.status).toBe(200);
  });

  it("4.1: bloquea el sexto pedido de recuperación en la hora", async () => {
    for (
      let attempt = 1;
      attempt <= PASSWORD_RESET_ATTEMPTS_ALLOWED;
      attempt += 1
    ) {
      expect((await requestPasswordReset(PERSON_EMAIL)).status).toBe(200);
    }

    expect((await requestPasswordReset(PERSON_EMAIL)).status).toBe(429);
  });

  it("4.1: bloquea el sexto intento de restablecer en la hora", async () => {
    for (
      let attempt = 1;
      attempt <= PASSWORD_RESET_ATTEMPTS_ALLOWED;
      attempt += 1
    ) {
      expect(
        (await resetPassword("token-inexistente", NEW_PASSWORD)).status,
      ).toBe(400);
    }

    expect(
      (await resetPassword("token-inexistente", NEW_PASSWORD)).status,
    ).toBe(429);
  });
});
