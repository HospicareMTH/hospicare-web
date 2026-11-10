// @vitest-environment node
import { sql } from "drizzle-orm";
import { beforeEach, describe, expect, it } from "vitest";

import { getDatabase } from "@/platform/database/client";
import { resetTestDatabase } from "@/platform/database/test-database";

import { createFirstSuperUser } from "./service";

const FICTITIOUS_SUPER_USER = {
  name: "Ana Prueba",
  email: "Ana.Prueba@hospicare.test",
  password: "clave-de-prueba-larga",
};

type AuditRow = { action: string; new_value: Record<string, unknown> | null };

async function findAuditActions(): Promise<AuditRow[]> {
  const result = await getDatabase().execute<AuditRow>(
    sql`select action, new_value from audit_log order by id`,
  );
  return result.rows;
}

describe("createFirstSuperUser", () => {
  beforeEach(resetTestDatabase);

  it("R-06: crea el primer Super user con su rol y el correo normalizado", async () => {
    await expect(createFirstSuperUser(FICTITIOUS_SUPER_USER)).resolves.toBe(
      "created",
    );

    const result = await getDatabase().execute<{
      email: string;
      system_key: string;
    }>(sql`
      select users.email, roles.system_key
      from users
      join user_roles on user_roles.user_id = users.id
      join roles on roles.id = user_roles.role_id
    `);
    expect(result.rows).toEqual([
      { email: "ana.prueba@hospicare.test", system_key: "super_user" },
    ]);
  });

  it("R-06: no crea un segundo Super user", async () => {
    await createFirstSuperUser(FICTITIOUS_SUPER_USER);

    await expect(
      createFirstSuperUser({
        ...FICTITIOUS_SUPER_USER,
        email: "otra.persona@hospicare.test",
      }),
    ).resolves.toBe("super-user-already-exists");
  });

  it("RF-ACC-04: rechaza contraseñas de menos de 12 caracteres", async () => {
    await expect(
      createFirstSuperUser({ ...FICTITIOUS_SUPER_USER, password: "corta" }),
    ).rejects.toThrow("al menos 12 caracteres");
  });

  it("RN-20: registra el alta en el registro de actividad sin la contraseña", async () => {
    await createFirstSuperUser(FICTITIOUS_SUPER_USER);

    const auditRows = await findAuditActions();
    expect(auditRows.map((row) => row.action)).toEqual([
      "user.created",
      "account.created",
      "user_role.created",
    ]);
    const accountEntry = auditRows.find(
      (row) => row.action === "account.created",
    );
    expect(accountEntry?.new_value).not.toHaveProperty("password");
  });
});
