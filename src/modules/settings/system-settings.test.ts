// @vitest-environment node

import { eq, sql } from "drizzle-orm";
import { beforeEach, describe, expect, it } from "vitest";

import { createFirstSuperUser, PERMISSION_GROUPS } from "@/modules/access";
import { getDatabase, runInTransactionAs } from "@/platform/database/client";
import { resetTestDatabase } from "@/platform/database/test-database";

import { LAST_CLINICAL_RECORD_NUMBER_KEY, systemSettings } from "./tables";

const CHECK_VIOLATION = { cause: { code: "23514" } };
const PERMISSION_DENIED = { cause: { code: "42501" } };
const CLINICAL_RECORD_NUMBER_ASSIGNMENT_CONTEXT =
  "clinical_record_number_assignment";

const byLastClinicalRecordNumber = eq(
  systemSettings.key,
  LAST_CLINICAL_RECORD_NUMBER_KEY,
);

async function createActorUserId(): Promise<string> {
  const email = "ana.prueba@hospicare.test";
  await createFirstSuperUser({
    name: "Ana Prueba",
    email,
    password: "clave-de-prueba-larga",
  });
  const result = await getDatabase().execute<{ id: string }>(
    sql`select id from users where email = ${email}`,
  );
  const [actor] = result.rows;
  if (!actor) {
    throw new Error("No se creó el usuario de prueba.");
  }
  return actor.id;
}

async function readLastClinicalRecordNumber(): Promise<unknown> {
  const [setting] = await getDatabase()
    .select({ value: systemSettings.value })
    .from(systemSettings)
    .where(byLastClinicalRecordNumber);
  return setting?.value;
}

async function listSettingAuditActions(): Promise<
  { action: string; actor_user_id: string | null }[]
> {
  const result = await getDatabase().execute<{
    action: string;
    actor_user_id: string | null;
  }>(
    sql`select action, actor_user_id from audit_log
        where resource = 'system_setting' order by id`,
  );
  return result.rows;
}

describe("configuración: base", () => {
  beforeEach(async () => {
    await resetTestDatabase();
  });

  it("RF-CFG-04: el último número de historia clínica arranca en 0", async () => {
    await expect(readLastClinicalRecordNumber()).resolves.toBe(0);
  });

  it.each([-1, 1.5, "12"])(
    "RF-CFG-04: la base rechaza %j como último número",
    async (value) => {
      await expect(
        getDatabase()
          .update(systemSettings)
          .set({ value })
          .where(byLastClinicalRecordNumber),
      ).rejects.toMatchObject(CHECK_VIOLATION);
    },
  );

  it("RF-CFG-04, RN-20: registra el cambio manual del número con responsable", async () => {
    const actorUserId = await createActorUserId();

    await runInTransactionAs(actorUserId, (transaction) =>
      transaction
        .update(systemSettings)
        .set({ value: 101, updatedByUserId: actorUserId })
        .where(byLastClinicalRecordNumber),
    );

    await expect(readLastClinicalRecordNumber()).resolves.toBe(101);
    await expect(listSettingAuditActions()).resolves.toEqual([
      { action: "system_setting.updated", actor_user_id: actorUserId },
    ]);
  });

  it("RF-HUE-07: el aumento al asignar un número no genera una entrada propia", async () => {
    const actorUserId = await createActorUserId();

    await runInTransactionAs(actorUserId, async (transaction) => {
      await transaction.execute(
        sql`select set_config('hospicare.audit_context', ${CLINICAL_RECORD_NUMBER_ASSIGNMENT_CONTEXT}, true)`,
      );
      await transaction
        .update(systemSettings)
        .set({ value: 1 })
        .where(byLastClinicalRecordNumber);
    });

    await expect(readLastClinicalRecordNumber()).resolves.toBe(1);
    await expect(listSettingAuditActions()).resolves.toEqual([]);
  });

  it("RF-CFG-04: la aplicación no puede borrar parámetros", async () => {
    await expect(
      getDatabase().execute(sql`delete from system_settings`),
    ).rejects.toMatchObject(PERMISSION_DENIED);
  });

  it("RF-ROL-08: declara los permisos de configuración", () => {
    const settingsGroup = PERMISSION_GROUPS.find(
      (group) => group.key === "system_settings",
    );

    expect(
      settingsGroup?.permissions.map((permission) => permission.key),
    ).toEqual(["admin.system_settings.view", "admin.system_settings.update"]);
  });
});
