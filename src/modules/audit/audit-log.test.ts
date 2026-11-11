// @vitest-environment node
import { sql } from "drizzle-orm";
import { beforeEach, describe, expect, it } from "vitest";

import { getDatabase } from "@/platform/database/client";
import { resetTestDatabase } from "@/platform/database/test-database";

import { recordFailedSignIn } from "./service";

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

  it("RN-24, CS-11: el usuario de la aplicación no puede borrarlo", async () => {
    await expect(
      getDatabase().execute(sql`delete from audit_log`),
    ).rejects.toThrow();
  });
});
