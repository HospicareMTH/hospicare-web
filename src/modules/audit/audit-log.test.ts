// @vitest-environment node
import { sql } from "drizzle-orm";
import { beforeEach, describe, expect, it } from "vitest";

import { getDatabase } from "@/platform/database/client";
import { resetTestDatabase } from "@/platform/database/test-database";

import { countAuditEntriesSince, recordFailedSignIn } from "./service";

const ONE_SECOND_IN_MILLISECONDS = 1000;
const ONE_HOUR_IN_MILLISECONDS = 3_600_000;

describe("registro de actividad", () => {
  beforeEach(async () => {
    await resetTestDatabase();
    await recordFailedSignIn({
      targetUserId: null,
      ipAddress: "203.0.113.10",
      userAgent: null,
    });
  });

  it("RN-24, CS-11: el usuario de la aplicación no puede modificarlo", async () => {
    await expect(
      getDatabase().execute(sql`update audit_log set status = 'success'`),
    ).rejects.toThrow();
  });

  it("RF-DAS-02: cuenta las entradas desde el inicio de la ventana, incluido el borde", async () => {
    const windowStart = new Date(Date.now() - ONE_HOUR_IN_MILLISECONDS);
    const beforeWindow = new Date(
      windowStart.getTime() - ONE_SECOND_IN_MILLISECONDS,
    );
    await getDatabase().execute(
      sql`insert into audit_log (action, operation, resource, status, occurred_at)
          values ('role.created', 'create', 'role', 'success', ${beforeWindow.toISOString()}::timestamptz),
                 ('role.updated', 'update', 'role', 'success', ${windowStart.toISOString()}::timestamptz)`,
    );

    await expect(countAuditEntriesSince(windowStart)).resolves.toBe(2);
  });

  it("RN-24, CS-11: el usuario de la aplicación no puede borrarlo", async () => {
    await expect(
      getDatabase().execute(sql`delete from audit_log`),
    ).rejects.toThrow();
  });
});
