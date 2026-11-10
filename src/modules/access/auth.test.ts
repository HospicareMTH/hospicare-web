// @vitest-environment node
import { sql } from "drizzle-orm";
import { beforeEach, describe, expect, it } from "vitest";

import { getDatabase } from "@/platform/database/client";
import { resetTestDatabase } from "@/platform/database/test-database";

import { getAuth } from "./auth";
import { createFirstSuperUser } from "./service";

const FICTITIOUS_SUPER_USER = {
  name: "Ana Prueba",
  email: "ana.prueba@hospicare.test",
  password: "clave-de-prueba-larga",
};
const CLIENT_IP = "203.0.113.10";
const WRONG_PASSWORD = "otra-clave-incorrecta";
const SIGN_IN_ATTEMPTS_ALLOWED = 5;

function getBaseUrl(): string {
  const baseUrl = process.env.BETTER_AUTH_URL;
  if (!baseUrl) {
    throw new Error("Falta BETTER_AUTH_URL en .env.test.local.");
  }
  return baseUrl;
}

function postToAuth(
  path: string,
  body: object,
  extraHeaders: Record<string, string> = {},
) {
  return getAuth().handler(
    new Request(`${getBaseUrl()}/api/auth${path}`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        origin: getBaseUrl(),
        "cf-connecting-ip": CLIENT_IP,
        "user-agent": "Navegador de prueba",
        ...extraHeaders,
      },
      body: JSON.stringify(body),
    }),
  );
}

function signIn(password: string, extraHeaders: Record<string, string> = {}) {
  return postToAuth(
    "/sign-in/email",
    { email: FICTITIOUS_SUPER_USER.email, password },
    extraHeaders,
  );
}

type AuditRow = {
  action: string;
  status: string;
  target_user_id: string | null;
  ip_address: string | null;
  user_agent: string | null;
};

async function findAuditEntry(action: string): Promise<AuditRow | undefined> {
  const result = await getDatabase().execute<AuditRow>(sql`
    select action, status, target_user_id, ip_address, user_agent
    from audit_log where action = ${action} order by id desc limit 1
  `);
  return result.rows[0];
}

async function findSuperUserId(): Promise<string> {
  const result = await getDatabase().execute<{ id: string }>(
    sql`select id from users where email = ${FICTITIOUS_SUPER_USER.email}`,
  );
  const [user] = result.rows;
  if (!user) {
    throw new Error("No se creó el usuario de prueba.");
  }
  return user.id;
}

function extractSessionCookie(response: Response): string {
  const cookie = response.headers.get("set-cookie")?.split(";")[0];
  if (!cookie) {
    throw new Error("La respuesta no trae cookie de sesión.");
  }
  return cookie;
}

describe("autenticación", () => {
  beforeEach(async () => {
    await resetTestDatabase();
    await createFirstSuperUser(FICTITIOUS_SUPER_USER);
  });

  it("RF-ACC-02, RN-23: inicia sesión y lo registra con IP y navegador", async () => {
    const response = await signIn(FICTITIOUS_SUPER_USER.password);

    expect(response.status).toBe(200);
    expect(extractSessionCookie(response)).toContain("session_token");
    await expect(findAuditEntry("session.started")).resolves.toMatchObject({
      status: "success",
      target_user_id: await findSuperUserId(),
      ip_address: CLIENT_IP,
      user_agent: "Navegador de prueba",
    });
  });

  it("RF-ACC-01: no permite registrarse", async () => {
    const response = await postToAuth("/sign-up/email", {
      name: "Persona Nueva",
      email: "persona.nueva@hospicare.test",
      password: "clave-de-prueba-larga",
    });

    expect(response.ok).toBe(false);
    const result = await getDatabase().execute(
      sql`select id from users where email = 'persona.nueva@hospicare.test'`,
    );
    expect(result.rows).toHaveLength(0);
  });

  it("R-11: registra el ingreso fallido como fallido y sin el correo", async () => {
    const response = await signIn(WRONG_PASSWORD);

    expect(response.status).toBe(401);
    const entry = await findAuditEntry("session.sign_in_failed");
    expect(entry).toMatchObject({
      status: "failure",
      target_user_id: await findSuperUserId(),
      ip_address: CLIENT_IP,
    });
    expect(JSON.stringify(entry)).not.toContain(FICTITIOUS_SUPER_USER.email);
  });

  it("4.1, SC-11, CS-04: bloquea el sexto intento aunque cambie X-Forwarded-For", async () => {
    for (let attempt = 1; attempt <= SIGN_IN_ATTEMPTS_ALLOWED; attempt += 1) {
      const response = await signIn(WRONG_PASSWORD, {
        "x-forwarded-for": `198.51.100.${attempt}`,
      });
      expect(response.status).toBe(401);
    }

    const blockedResponse = await signIn(FICTITIOUS_SUPER_USER.password, {
      "x-forwarded-for": "198.51.100.99",
    });
    expect(blockedResponse.status).toBe(429);
  });

  it("RF-ACC-08: cerrar sesión la revoca y lo registra", async () => {
    const sessionCookie = extractSessionCookie(
      await signIn(FICTITIOUS_SUPER_USER.password),
    );

    const response = await postToAuth(
      "/sign-out",
      {},
      { cookie: sessionCookie },
    );

    expect(response.status).toBe(200);
    await expect(findAuditEntry("session.revoked")).resolves.toMatchObject({
      status: "success",
      target_user_id: await findSuperUserId(),
    });
  });
});
