// @vitest-environment node
import { sql } from "drizzle-orm";
import { describe, expect, it } from "vitest";

import { checkDatabaseConnection, getDatabase } from "./client";

describe("checkDatabaseConnection", () => {
  it("RNF-11: consulta la base de PostgreSQL real", async () => {
    await expect(checkDatabaseConnection()).resolves.toBeUndefined();
  });
});

describe("usuario de la aplicación", () => {
  it("SB-05: no puede cambiar el esquema", async () => {
    await expect(
      getDatabase().execute(sql`create table schema_change_probe (id integer)`),
    ).rejects.toThrow();
  });
});
