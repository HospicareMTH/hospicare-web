// @vitest-environment node

import { sql } from "drizzle-orm";
import { beforeEach, describe, expect, it } from "vitest";

import { getDatabase } from "@/platform/database/client";
import { resetTestDatabase } from "@/platform/database/test-database";

import { getAuth } from "../auth/auth";
import { EMAIL_NOT_VERIFIED_ERROR_CODE } from "../auth/schemas";
import {
  createUserWithRole,
  FICTITIOUS_PASSWORD,
  findRoleId,
} from "../test-fixtures";
import { ACCOUNT_REJECTION_MESSAGES, updateOwnName } from "./service";

const STAFF_EMAIL = "lorena.ficticia@hospicare.test";
const NEW_PASSWORD = "otra-clave-de-prueba-larga";

function getBaseUrl(): string {
  const baseUrl = process.env.BETTER_AUTH_URL;
  if (!baseUrl) {
    throw new Error("Falta BETTER_AUTH_URL en .env.test.local.");
  }
  return baseUrl;
}

function postToAuth(path: string, body: object, cookie = "") {
  return getAuth().handler(
    new Request(`${getBaseUrl()}/api/auth${path}`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        origin: getBaseUrl(),
        "cf-connecting-ip": "203.0.113.70",
        cookie,
      },
      body: JSON.stringify(body),
    }),
  );
}

async function signInCookie(email: string, password = FICTITIOUS_PASSWORD) {
  const response = await postToAuth("/sign-in/email", { email, password });
  return response.headers
    .getSetCookie()
    .map((header) => header.split(";")[0])
    .join("; ");
}

async function markEmailVerified(userId: string) {
  await getDatabase().execute(
    sql`update users set email_verified = true where id = ${userId}`,
  );
}

async function countAuditEntries(action: string): Promise<number> {
  const result = await getDatabase().execute<{ count: string }>(
    sql`select count(*) as count from audit_log where action = ${action}`,
  );
  return Number(result.rows[0]?.count);
}

async function countSessions(userId: string): Promise<number> {
  const result = await getDatabase().execute<{ count: string }>(
    sql`select count(*) as count from sessions where user_id = ${userId}`,
  );
  return Number(result.rows[0]?.count);
}

describe("Mi cuenta", () => {
  let userRoleId: string;

  beforeEach(async () => {
    await resetTestDatabase();
    userRoleId = await findRoleId("Usuario");
  });

  it("RF-ACC-15, RF-ACC-10: edita el propio nombre solo con correo verificado", async () => {
    const staff = await createUserWithRole(STAFF_EMAIL, userRoleId);

    const unverified = await updateOwnName(staff.userId, "Lorena Nueva");
    await markEmailVerified(staff.userId);
    const verified = await updateOwnName(staff.userId, "Lorena Nueva");

    expect(unverified).toEqual({
      status: "rejected",
      message: ACCOUNT_REJECTION_MESSAGES.emailNotVerified,
    });
    expect(verified).toEqual({ status: "success" });
    const result = await getDatabase().execute<{ name: string }>(
      sql`select name from users where id = ${staff.userId}`,
    );
    expect(result.rows[0]?.name).toBe("Lorena Nueva");
  });

  it("RF-ACC-15: no permite cambiar el nombre por la ruta de Better Auth", async () => {
    await createUserWithRole(STAFF_EMAIL, userRoleId);

    const response = await postToAuth(
      "/update-user",
      { name: "X" },
      await signInCookie(STAFF_EMAIL),
    );

    expect(response.status).toBe(404);
  });

  it("RF-ACC-16, RF-ACC-10: cambia la contraseña con la actual y cierra las otras sesiones", async () => {
    const staff = await createUserWithRole(STAFF_EMAIL, userRoleId);
    await markEmailVerified(staff.userId);
    await signInCookie(STAFF_EMAIL);
    const cookie = await signInCookie(STAFF_EMAIL);

    const wrongCurrent = await postToAuth(
      "/change-password",
      {
        currentPassword: "otra-clave-incorrecta",
        newPassword: NEW_PASSWORD,
        revokeOtherSessions: true,
      },
      cookie,
    );
    const changed = await postToAuth(
      "/change-password",
      {
        currentPassword: FICTITIOUS_PASSWORD,
        newPassword: NEW_PASSWORD,
        revokeOtherSessions: true,
      },
      cookie,
    );

    expect(wrongCurrent.ok).toBe(false);
    expect(changed.status).toBe(200);
    expect(await countSessions(staff.userId)).toBe(1);
    expect(await countAuditEntries("user.password_updated")).toBe(1);
  });

  it("RF-ACC-16: siempre cierra las otras sesiones", async () => {
    const staff = await createUserWithRole(STAFF_EMAIL, userRoleId);
    await markEmailVerified(staff.userId);

    const response = await postToAuth(
      "/change-password",
      {
        currentPassword: FICTITIOUS_PASSWORD,
        newPassword: NEW_PASSWORD,
        revokeOtherSessions: false,
      },
      await signInCookie(STAFF_EMAIL),
    );

    expect(response.status).toBe(400);
  });

  it("RF-ACC-10: no cambia la contraseña sin correo verificado", async () => {
    await createUserWithRole(STAFF_EMAIL, userRoleId);

    const response = await postToAuth(
      "/change-password",
      {
        currentPassword: FICTITIOUS_PASSWORD,
        newPassword: NEW_PASSWORD,
        revokeOtherSessions: true,
      },
      await signInCookie(STAFF_EMAIL),
    );

    expect(response.status).toBe(403);
    expect(await response.json()).toMatchObject({
      code: EMAIL_NOT_VERIFIED_ERROR_CODE,
    });
  });

  it("4.1: bloquea el sexto cambio de contraseña en 10 minutos", async () => {
    const staff = await createUserWithRole(STAFF_EMAIL, userRoleId);
    await markEmailVerified(staff.userId);
    const cookie = await signInCookie(STAFF_EMAIL);
    const attempt = () =>
      postToAuth(
        "/change-password",
        {
          currentPassword: "otra-clave-incorrecta",
          newPassword: NEW_PASSWORD,
          revokeOtherSessions: true,
        },
        cookie,
      );

    for (let count = 1; count <= 5; count += 1) {
      expect((await attempt()).status).not.toBe(429);
    }
    expect((await attempt()).status).toBe(429);
  });
});
