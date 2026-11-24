// @vitest-environment node

import { sql } from "drizzle-orm";
import { z } from "zod";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { getDatabase } from "@/platform/database/client";
import { resetTestDatabase } from "@/platform/database/test-database";
import {
  FICTITIOUS_SUPER_USER,
  FORBIDDEN_DIGEST,
  restrictSignedInUserTo,
  signInAsSuperUser,
} from "@/testing/action-session";

import { updateLastClinicalRecordNumberAction } from "./actions";
import { lastClinicalRecordNumberInputSchema } from "./schemas";
import {
  getClinicalRecordNumberSetting,
  updateLastClinicalRecordNumber,
} from "./service";

vi.mock("next/headers", async () => {
  const session = await import("@/testing/action-session");
  return { headers: async () => session.testRequestHeaders.current };
});
vi.mock("next/cache", () => ({ refresh: vi.fn() }));

async function countSettingAuditEntries(): Promise<number> {
  const result = await getDatabase().execute<{ total: number }>(
    sql`select count(*)::int as total from audit_log where resource = 'system_setting'`,
  );
  return result.rows[0]?.total ?? 0;
}

function inputErrors(lastClinicalRecordNumber: string): string[] | undefined {
  const result = lastClinicalRecordNumberInputSchema.safeParse({
    lastClinicalRecordNumber,
  });
  return result.success
    ? undefined
    : z.flattenError(result.error).fieldErrors.lastClinicalRecordNumber;
}

describe("configuración: último número de historia clínica", () => {
  beforeEach(async () => {
    await resetTestDatabase();
    vi.stubEnv("__NEXT_EXPERIMENTAL_AUTH_INTERRUPTS", "true");
  });

  it("RF-CFG-04: acepta enteros desde 0 hasta 2.147.483.646, sin puntos ni espacios internos", () => {
    expect(inputErrors("")).toEqual(["Ingresá el último número asignado."]);
    expect(inputErrors("1.000")).toEqual([
      "Escribí solo números, sin puntos ni espacios.",
    ]);
    expect(inputErrors("-1")).toEqual([
      "Escribí solo números, sin puntos ni espacios.",
    ]);
    expect(inputErrors("2147483647")).toEqual([
      "El número no puede pasar de 2.147.483.646.",
    ]);
    expect(inputErrors("0")).toBeUndefined();
    expect(inputErrors(" 101 ")).toBeUndefined();
    expect(inputErrors("2147483646")).toBeUndefined();
  });

  it("RF-CFG-04, CA-22: guarda el número, informa quién lo cambió y lo deja en el registro de actividad", async () => {
    const actorUserId = await signInAsSuperUser();

    await expect(getClinicalRecordNumberSetting()).resolves.toEqual({
      lastAssignedNumber: 0,
      lastModification: null,
    });

    await expect(
      updateLastClinicalRecordNumber(actorUserId, 101),
    ).resolves.toEqual({ status: "success" });

    const setting = await getClinicalRecordNumberSetting();
    expect(setting.lastAssignedNumber).toBe(101);
    expect(setting.lastModification?.modifiedByName).toBe(
      FICTITIOUS_SUPER_USER.name,
    );
    expect(await countSettingAuditEntries()).toBe(1);
  });

  it("RF-CFG-04: rechaza un número menor que el último asignado sin cambiar nada", async () => {
    const actorUserId = await signInAsSuperUser();
    await updateLastClinicalRecordNumber(actorUserId, 101);

    await expect(
      updateLastClinicalRecordNumber(actorUserId, 100),
    ).resolves.toEqual({
      status: "invalid",
      fieldErrors: {
        lastClinicalRecordNumber: [
          "El número no puede ser menor que 101, el último que ya se asignó.",
        ],
      },
    });
    expect((await getClinicalRecordNumberSetting()).lastAssignedNumber).toBe(
      101,
    );
    expect(await countSettingAuditEntries()).toBe(1);
  });

  it("RF-CFG-04, RN-20: guardar el mismo número no cambia nada ni deja registro", async () => {
    const actorUserId = await signInAsSuperUser();
    await updateLastClinicalRecordNumber(actorUserId, 101);

    await expect(
      updateLastClinicalRecordNumber(actorUserId, 101),
    ).resolves.toEqual({ status: "success" });
    expect(await countSettingAuditEntries()).toBe(1);
  });

  it("RF-CFG-04: la acción valida el número en el servidor", async () => {
    await signInAsSuperUser();

    await expect(
      updateLastClinicalRecordNumberAction({
        lastClinicalRecordNumber: "1.000",
      }),
    ).resolves.toMatchObject({ status: "invalid" });
    await expect(
      updateLastClinicalRecordNumberAction({ lastClinicalRecordNumber: "150" }),
    ).resolves.toEqual({ status: "success" });
    expect((await getClinicalRecordNumberSetting()).lastAssignedNumber).toBe(
      150,
    );
  });

  it("CA-03, RF-ROL-08: con permiso de ver solamente, el servidor rechaza el cambio", async () => {
    await signInAsSuperUser();
    await restrictSignedInUserTo(["admin.system_settings.view"]);

    await expect(
      updateLastClinicalRecordNumberAction({ lastClinicalRecordNumber: "150" }),
    ).rejects.toMatchObject({ digest: FORBIDDEN_DIGEST });
    expect((await getClinicalRecordNumberSetting()).lastAssignedNumber).toBe(0);
    expect(await countSettingAuditEntries()).toBe(0);
  });
});
