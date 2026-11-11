// @vitest-environment node

import { sql } from "drizzle-orm";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { getDatabase } from "@/platform/database/client";
import { resetTestDatabase } from "@/platform/database/test-database";
import type { MailMessage } from "@/platform/mail";

import { getAuth } from "./auth";
import { EMAIL_NOT_VERIFIED_ERROR_CODE } from "./schemas";
import type { UserAccess } from "../authorization/service";
import {
  createUserWithRole,
  FICTITIOUS_PASSWORD,
  findRoleId,
  generateTotpCode,
} from "../test-fixtures";

const sentMails = vi.hoisted(() => ({ messages: [] as MailMessage[] }));

vi.mock("@/platform/mail", () => ({
  sendMail: async (message: MailMessage) => {
    sentMails.messages.push(message);
  },
}));

const PERSON_EMAIL = "marta.ficticia@hospicare.test";
const BACKUP_CODE_PATTERN = /^[A-Za-z0-9]{5}-[A-Za-z0-9]{5}$/;
const ATTEMPTS_ALLOWED = 5;

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
        "cf-connecting-ip": "203.0.113.50",
        cookie,
      },
      body: JSON.stringify(body),
    }),
  );
}

function readCookies(response: Response): string {
  return response.headers
    .getSetCookie()
    .map((header) => header.split(";")[0])
    .filter((pair) => !pair?.endsWith("="))
    .join("; ");
}

async function signIn(): Promise<Response> {
  return postToAuth("/sign-in/email", {
    email: PERSON_EMAIL,
    password: FICTITIOUS_PASSWORD,
  });
}

async function signInCookie(): Promise<string> {
  return readCookies(await signIn());
}

function lastMailCode(): string {
  const message = sentMails.messages.at(-1);
  if (!message || !("code" in message)) {
    throw new Error("No se envió ningún correo con código.");
  }
  return message.code;
}

function generateTotp(totpUri: string): string {
  return generateTotpCode(new URL(totpUri).searchParams.get("secret") ?? "");
}

async function markEmailVerified(userId: string) {
  await getDatabase().execute(
    sql`update users set email_verified = true where id = ${userId}`,
  );
}

type EnabledTwoFactor = {
  totpUri: string;
  backupCodes: string[];
  sessionCookie: string;
};

async function enableTwoFactor(cookie: string): Promise<EnabledTwoFactor> {
  const response = await postToAuth(
    "/two-factor/enable",
    { password: FICTITIOUS_PASSWORD },
    cookie,
  );
  const body = (await response.json()) as {
    totpURI: string;
    backupCodes: string[];
  };
  const confirmation = await postToAuth(
    "/two-factor/verify-totp",
    { code: generateTotp(body.totpURI) },
    cookie,
  );
  expect(confirmation.status).toBe(200);
  // Better Auth rota la sesión al confirmar la activación.
  return {
    totpUri: body.totpURI,
    backupCodes: body.backupCodes,
    sessionCookie: readCookies(confirmation),
  };
}

async function countAuditEntries(action: string): Promise<number> {
  const result = await getDatabase().execute<{ count: string }>(
    sql`select count(*) as count from audit_log where action = ${action}`,
  );
  return Number(result.rows[0]?.count);
}

describe("verificación de correo y segundo factor", () => {
  let person: UserAccess;

  beforeEach(async () => {
    await resetTestDatabase();
    sentMails.messages = [];
    person = await createUserWithRole(
      PERSON_EMAIL,
      await findRoleId("Usuario"),
    );
  });

  it("RF-ACC-09, RN-20: verifica el correo con el código y lo registra", async () => {
    const cookie = await signInCookie();

    const sent = await postToAuth(
      "/email-otp/send-verification-otp",
      { email: PERSON_EMAIL, type: "email-verification" },
      cookie,
    );
    expect(sent.status).toBe(200);
    expect(lastMailCode()).toMatch(/^\d{6}$/);

    const verified = await postToAuth(
      "/email-otp/verify-email",
      { email: PERSON_EMAIL, otp: lastMailCode() },
      cookie,
    );
    expect(verified.status).toBe(200);
    expect(await countAuditEntries("user.email_verified")).toBe(1);
  });

  it("RF-ACC-09: el código vence a los 5 minutos y se guarda cifrado", async () => {
    const cookie = await signInCookie();
    const requestedAt = Date.now();
    await postToAuth(
      "/email-otp/send-verification-otp",
      { email: PERSON_EMAIL, type: "email-verification" },
      cookie,
    );

    const result = await getDatabase().execute<{
      value: string;
      expires_at: Date;
    }>(sql`select value, expires_at from verifications`);
    const [verification] = result.rows;
    expect(verification?.value).not.toContain(lastMailCode());
    const validity =
      new Date(verification?.expires_at ?? 0).getTime() - requestedAt;
    expect(Math.abs(validity - 5 * 60_000)).toBeLessThan(60_000);
  });

  it("RF-ACC-09: invalida el código después de 5 intentos fallidos", async () => {
    const cookie = await signInCookie();
    await postToAuth(
      "/email-otp/send-verification-otp",
      { email: PERSON_EMAIL, type: "email-verification" },
      cookie,
    );
    const code = lastMailCode();
    const wrongCode = code === "000000" ? "111111" : "000000";

    for (let attempt = 1; attempt <= ATTEMPTS_ALLOWED; attempt += 1) {
      await postToAuth(
        "/email-otp/verify-email",
        { email: PERSON_EMAIL, otp: wrongCode },
        cookie,
      );
    }

    const lateAttempt = await postToAuth(
      "/email-otp/verify-email",
      { email: PERSON_EMAIL, otp: code },
      cookie,
    );
    expect(lateAttempt.ok).toBe(false);
  });

  it("RF-ACC-09: permite hasta 3 envíos por minuto", async () => {
    const cookie = await signInCookie();
    const send = () =>
      postToAuth(
        "/email-otp/send-verification-otp",
        { email: PERSON_EMAIL, type: "email-verification" },
        cookie,
      );

    for (let attempt = 1; attempt <= 3; attempt += 1) {
      expect((await send()).status).toBe(200);
    }
    expect((await send()).status).toBe(429);
  });

  it("RF-ACC-09: solo envía el código al correo propio y con sesión", async () => {
    const cookie = await signInCookie();

    const otherEmail = await postToAuth(
      "/email-otp/send-verification-otp",
      { email: "otra.persona@hospicare.test", type: "email-verification" },
      cookie,
    );
    const withoutSession = await postToAuth(
      "/email-otp/send-verification-otp",
      { email: PERSON_EMAIL, type: "email-verification" },
    );
    const signInCode = await postToAuth(
      "/email-otp/send-verification-otp",
      { email: PERSON_EMAIL, type: "sign-in" },
      cookie,
    );

    expect(otherEmail.status).toBe(403);
    expect(withoutSession.status).toBe(401);
    expect(signInCode.status).toBe(403);
    expect(sentMails.messages).toHaveLength(0);
  });

  it("RF-ACC-01: no permite entrar solo con un código por correo", async () => {
    const response = await postToAuth("/sign-in/email-otp", {
      email: PERSON_EMAIL,
      otp: "123456",
    });

    expect(response.status).toBe(404);
  });

  it("RF-ACC-10: no permite activar el segundo factor sin correo verificado", async () => {
    const response = await postToAuth(
      "/two-factor/enable",
      { password: FICTITIOUS_PASSWORD },
      await signInCookie(),
    );

    expect(response.status).toBe(403);
    expect(await response.json()).toMatchObject({
      code: EMAIL_NOT_VERIFIED_ERROR_CODE,
    });
  });

  it("RF-ACC-11: no permite activar el segundo factor solo por correo", async () => {
    await markEmailVerified(person.userId);

    const response = await postToAuth(
      "/two-factor/enable",
      { password: FICTITIOUS_PASSWORD, method: "otp" },
      await signInCookie(),
    );

    expect(response.status).toBe(400);
    const result = await getDatabase().execute(
      sql`select id from users where two_factor_enabled`,
    );
    expect(result.rows).toHaveLength(0);
  });

  it("RF-ACC-11, RF-ACC-13, RN-20: activa con un primer código y entrega 10 códigos de respaldo", async () => {
    await markEmailVerified(person.userId);
    const cookie = await signInCookie();

    const { totpUri, backupCodes } = await enableTwoFactor(cookie);

    const uri = new URL(totpUri);
    expect(uri.protocol).toBe("otpauth:");
    expect(uri.searchParams.get("issuer")).toBe("Hospicare");
    expect(uri.searchParams.get("digits")).toBe("6");
    expect(uri.searchParams.get("period")).toBe("30");
    expect(backupCodes).toHaveLength(10);
    for (const code of backupCodes) {
      expect(code).toMatch(BACKUP_CODE_PATTERN);
    }
    expect(await countAuditEntries("user.two_factor_enabled")).toBe(1);
  });

  it("RNF-02: guarda el secreto y los códigos de respaldo cifrados", async () => {
    await markEmailVerified(person.userId);
    const { totpUri, backupCodes } = await enableTwoFactor(
      await signInCookie(),
    );

    const result = await getDatabase().execute<{
      secret: string;
      backup_codes: string;
    }>(sql`select secret, backup_codes from two_factors`);
    const [stored] = result.rows;
    const secret = new URL(totpUri).searchParams.get("secret") ?? "";
    expect(stored?.secret).not.toContain(secret);
    expect(stored?.backup_codes).not.toContain(backupCodes[0]);
    const auditValues = await getDatabase().execute<{ entry: string }>(
      sql`select concat(previous_value, new_value) as entry from audit_log`,
    );
    for (const { entry } of auditValues.rows) {
      expect(entry).not.toContain("secret");
      expect(entry).not.toContain("backup_codes");
    }
  });

  it("RF-ACC-12, 8.4: con segundo factor el ingreso pide la aplicación", async () => {
    await markEmailVerified(person.userId);
    const { totpUri } = await enableTwoFactor(await signInCookie());

    const signInResponse = await signIn();
    expect(await signInResponse.json()).toMatchObject({
      twoFactorRedirect: true,
    });
    const verification = await postToAuth(
      "/two-factor/verify-totp",
      { code: generateTotp(totpUri) },
      readCookies(signInResponse),
    );

    expect(verification.status).toBe(200);
    expect(readCookies(verification)).toContain("session_token");
  });

  it("RF-ACC-12: permite entrar con un código por correo de 3 minutos", async () => {
    await markEmailVerified(person.userId);
    await enableTwoFactor(await signInCookie());
    const pendingCookie = readCookies(await signIn());

    const sendStartedAt = Date.now();
    await postToAuth("/two-factor/send-otp", {}, pendingCookie);
    const verification = await postToAuth(
      "/two-factor/verify-otp",
      { code: lastMailCode() },
      pendingCookie,
    );

    expect(verification.status).toBe(200);
    expect(sentMails.messages.at(-1)?.subject).toBe(
      "Tu código para entrar a Hospicare",
    );
    expect(Date.now() - sendStartedAt).toBeLessThan(3 * 60_000);
  });

  it("RF-ACC-12, RF-ACC-13: un código de respaldo sirve una sola vez", async () => {
    await markEmailVerified(person.userId);
    const { backupCodes } = await enableTwoFactor(await signInCookie());
    const [backupCode] = backupCodes;

    const firstUse = await postToAuth(
      "/two-factor/verify-backup-code",
      { code: backupCode },
      readCookies(await signIn()),
    );
    const secondUse = await postToAuth(
      "/two-factor/verify-backup-code",
      { code: backupCode },
      readCookies(await signIn()),
    );

    expect(firstUse.status).toBe(200);
    expect(secondUse.ok).toBe(false);
  });

  it("4.1: bloquea la sexta verificación de segundo factor en un minuto", async () => {
    await markEmailVerified(person.userId);
    await enableTwoFactor(await signInCookie());
    const pendingCookie = readCookies(await signIn());

    for (let attempt = 1; attempt <= ATTEMPTS_ALLOWED; attempt += 1) {
      await postToAuth(
        "/two-factor/verify-totp",
        { code: "000000" },
        pendingCookie,
      );
    }
    const blocked = await postToAuth(
      "/two-factor/verify-totp",
      { code: "000000" },
      pendingCookie,
    );

    expect(blocked.status).toBe(429);
  });

  it("RF-ACC-13, RN-20: regenera los códigos de respaldo con la contraseña", async () => {
    await markEmailVerified(person.userId);
    const { backupCodes, sessionCookie: cookie } = await enableTwoFactor(
      await signInCookie(),
    );

    const withoutPassword = await postToAuth(
      "/two-factor/generate-backup-codes",
      {},
      cookie,
    );
    const regenerated = await postToAuth(
      "/two-factor/generate-backup-codes",
      { password: FICTITIOUS_PASSWORD },
      cookie,
    );

    expect(withoutPassword.ok).toBe(false);
    expect(regenerated.status).toBe(200);
    const body = (await regenerated.json()) as { backupCodes: string[] };
    expect(body.backupCodes).toHaveLength(10);
    expect(body.backupCodes).not.toContain(backupCodes[0]);
    expect(await countAuditEntries("two_factor.backup_codes_updated")).toBe(1);
  });

  it("RF-ACC-14, RN-20: desactiva el segundo factor solo con la contraseña", async () => {
    await markEmailVerified(person.userId);
    const { sessionCookie: cookie } = await enableTwoFactor(
      await signInCookie(),
    );

    const wrongPassword = await postToAuth(
      "/two-factor/disable",
      { password: "otra-clave-incorrecta" },
      cookie,
    );
    const disabled = await postToAuth(
      "/two-factor/disable",
      { password: FICTITIOUS_PASSWORD },
      cookie,
    );

    expect(wrongPassword.ok).toBe(false);
    expect(disabled.status).toBe(200);
    expect(await countAuditEntries("user.two_factor_disabled")).toBe(1);
    const signInResponse = await signIn();
    expect(readCookies(signInResponse)).toContain("session_token");
  });
});
