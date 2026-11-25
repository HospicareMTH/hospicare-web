// @vitest-environment node

import { sql } from "drizzle-orm";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { getDatabase } from "@/platform/database/client";
import { resetTestDatabase } from "@/platform/database/test-database";
import {
  FORBIDDEN_DIGEST,
  restrictSignedInUserTo,
  signInAsSuperUser,
} from "@/testing/action-session";

import { updateDailyEvolutionEditWindowAction } from "./actions";
import {
  computeEditableUntil,
  describeEditWindow,
  type EditWindowInput,
  editWindowInputSchema,
} from "./schemas";
import {
  getDailyEvolutionEditWindow,
  getDailyEvolutionEditWindowSetting,
} from "./service";

vi.mock("next/headers", async () => {
  const session = await import("@/testing/action-session");
  return { headers: async () => session.testRequestHeaders.current };
});
vi.mock("next/cache", () => ({ refresh: vi.fn() }));

const REGISTERED_AT = new Date("2026-11-20T15:00:00.000Z");

function amountErrors(input: EditWindowInput): string[] | undefined {
  const result = editWindowInputSchema.safeParse(input);
  return result.success
    ? undefined
    : result.error.issues
        .filter((issue) => issue.path[0] === "amount")
        .map((issue) => issue.message);
}

async function countWindowAuditEntries(): Promise<number> {
  const result = await getDatabase().execute<{ total: number }>(
    sql`select count(*)::int as total from audit_log
        where resource = 'system_setting' and resource_id = 'daily_evolution_edit_window'`,
  );
  return result.rows[0]?.total ?? 0;
}

describe("configuración: ventana de edición de evoluciones", () => {
  beforeEach(async () => {
    await resetTestDatabase();
    vi.stubEnv("__NEXT_EXPERIMENTAL_AUTH_INTERRUPTS", "true");
  });

  it("RF-CFG-02: el valor inicial es 24 horas", async () => {
    const editWindow = await getDailyEvolutionEditWindow();

    expect(editWindow).toEqual({ mode: "duration", amount: 24, unit: "hours" });
    expect(describeEditWindow(editWindow)).toBe("24 horas");
  });

  it("RF-CFG-02: admite de 1 minuto a 30 días, en enteros", () => {
    expect(
      amountErrors({ mode: "duration", amount: "0", unit: "hours" }),
    ).toEqual(["La cantidad debe ser un número entero mayor que 0."]);
    expect(
      amountErrors({ mode: "duration", amount: "1,5", unit: "hours" }),
    ).toEqual(["La cantidad debe ser un número entero mayor que 0."]);
    expect(
      amountErrors({ mode: "duration", amount: "31", unit: "days" }),
    ).toEqual(["La ventana no puede superar los 30 días."]);
    expect(
      amountErrors({ mode: "duration", amount: "721", unit: "hours" }),
    ).toEqual(["La ventana no puede superar los 30 días."]);
    expect(
      amountErrors({ mode: "duration", amount: "43200", unit: "minutes" }),
    ).toBeUndefined();
    expect(
      amountErrors({ mode: "immediate", amount: "", unit: "hours" }),
    ).toBeUndefined();
  });

  it("RF-CFG-03, RN-07: el límite es el registro más la ventana; con bloqueo inmediato, el mismo registro", () => {
    expect(
      computeEditableUntil(
        { mode: "duration", amount: 2, unit: "days" },
        REGISTERED_AT,
      ),
    ).toEqual(new Date("2026-11-22T15:00:00.000Z"));
    expect(computeEditableUntil({ mode: "immediate" }, REGISTERED_AT)).toEqual(
      REGISTERED_AT,
    );
  });

  it("RF-CFG-02, RN-20: guarda la ventana, registra quién la cambió y no registra si no cambió", async () => {
    await signInAsSuperUser();

    const result = await updateDailyEvolutionEditWindowAction({
      mode: "immediate",
      amount: "24",
      unit: "hours",
    });
    await updateDailyEvolutionEditWindowAction({
      mode: "immediate",
      amount: "3",
      unit: "days",
    });

    expect(result).toEqual({ status: "success" });
    const setting = await getDailyEvolutionEditWindowSetting();
    expect(setting.window).toEqual({ mode: "immediate" });
    expect(setting.lastModification?.modifiedByName).toBe("Ana Prueba");
    await expect(countWindowAuditEntries()).resolves.toBe(1);
  });

  it("RF-CFG-02: la acción devuelve el error junto al campo", async () => {
    await signInAsSuperUser();

    await expect(
      updateDailyEvolutionEditWindowAction({
        mode: "duration",
        amount: "40",
        unit: "days",
      }),
    ).resolves.toEqual({
      status: "invalid",
      fieldErrors: { amount: ["La ventana no puede superar los 30 días."] },
    });
  });

  it("RF-CFG-02: la base rechaza una ventana fuera de rango", async () => {
    await expect(
      getDatabase().execute(
        sql`update system_settings
            set value = '{"mode": "duration", "amount": 31, "unit": "days"}'::jsonb
            where key = 'daily_evolution_edit_window'`,
      ),
    ).rejects.toMatchObject({
      cause: {
        constraint: "system_settings_daily_evolution_edit_window_format",
      },
    });
  });

  it("RF-ROL-08: sin permiso de modificar la configuración el servidor rechaza", async () => {
    await signInAsSuperUser();
    await restrictSignedInUserTo(["admin.system_settings.view"]);

    await expect(
      updateDailyEvolutionEditWindowAction({
        mode: "immediate",
        amount: "",
        unit: "hours",
      }),
    ).rejects.toMatchObject({ digest: FORBIDDEN_DIGEST });
    await expect(getDailyEvolutionEditWindow()).resolves.toEqual({
      mode: "duration",
      amount: 24,
      unit: "hours",
    });
  });
});
