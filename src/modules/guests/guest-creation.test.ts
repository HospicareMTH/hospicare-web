// @vitest-environment node

import { eq, sql } from "drizzle-orm";
import { z } from "zod";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { getDatabase } from "@/platform/database/client";
import { resetTestDatabase } from "@/platform/database/test-database";
import {
  FORBIDDEN_DIGEST,
  restrictSignedInUserTo,
  signInAsSuperUser,
} from "@/testing/action-session";

import { checkGuestDniAction, createGuestManuallyAction } from "./actions";
import {
  buildEmptyGuest,
  type GuestDetailsInput,
  guestDetailsSchema,
} from "./schemas";
import { createGuestManually } from "./service";
import { guests } from "./tables";
import { findSeededOptionId } from "./test-fixtures";

vi.mock("next/headers", async () => {
  const session = await import("@/testing/action-session");
  return { headers: async () => session.testRequestHeaders.current };
});

const TODAY = "2026-11-20";

function buildValidInput(
  overrides: Partial<GuestDetailsInput> = {},
): GuestDetailsInput {
  return {
    ...buildEmptyGuest(TODAY),
    firstName: "Persona",
    lastName: "Ficticia",
    birthDate: "1950-01-01",
    dni: "11.222.333",
    address: "Calle Ficticia 123",
    ...overrides,
  };
}

function parseDetails(input: GuestDetailsInput) {
  return guestDetailsSchema.parse(input);
}

function fieldErrorsOf(input: GuestDetailsInput) {
  const result = guestDetailsSchema.safeParse(input);
  return result.success ? {} : z.flattenError(result.error).fieldErrors;
}

async function setLastClinicalRecordNumber(value: number): Promise<void> {
  await getDatabase().execute(
    sql`update system_settings set value = to_jsonb(${value}::int) where key = 'last_clinical_record_number'`,
  );
}

async function readLastClinicalRecordNumber(): Promise<number> {
  const result = await getDatabase().execute<{ value: number }>(
    sql`select value from system_settings where key = 'last_clinical_record_number'`,
  );
  return result.rows[0]?.value ?? -1;
}

async function listAuditActions(): Promise<string[]> {
  const result = await getDatabase().execute<{ action: string }>(
    sql`select action from audit_log where resource in ('guest', 'system_setting') order by id`,
  );
  return result.rows.map(({ action }) => action);
}

async function countGuests(): Promise<number> {
  const result = await getDatabase().execute<{ total: number }>(
    sql`select count(*)::int as total from guests`,
  );
  return result.rows[0]?.total ?? 0;
}

describe("huéspedes: alta manual", () => {
  beforeEach(async () => {
    await resetTestDatabase();
    vi.stubEnv("__NEXT_EXPERIMENTAL_AUTH_INTERRUPTS", "true");
  });

  it("CA-22, RF-CFG-04, RF-HUE-07: con 101 configurado, dos altas reciben 102 y 103 y quedan como último asignado", async () => {
    const actorUserId = await signInAsSuperUser();
    await setLastClinicalRecordNumber(101);

    const first = await createGuestManually(
      actorUserId,
      parseDetails(buildValidInput()),
    );
    const second = await createGuestManually(
      actorUserId,
      parseDetails(buildValidInput({ dni: "22.333.444" })),
    );

    expect(first).toMatchObject({
      status: "success",
      clinicalRecordNumber: 102,
    });
    expect(second).toMatchObject({
      status: "success",
      clinicalRecordNumber: 103,
    });
    await expect(readLastClinicalRecordNumber()).resolves.toBe(103);
  });

  it("RF-HUE-07: dos altas simultáneas reciben números distintos y correlativos", async () => {
    const actorUserId = await signInAsSuperUser();

    const results = await Promise.all([
      createGuestManually(actorUserId, parseDetails(buildValidInput())),
      createGuestManually(
        actorUserId,
        parseDetails(buildValidInput({ dni: "22.333.444" })),
      ),
    ]);

    const numbers = results
      .map((result) =>
        result.status === "success" ? result.clinicalRecordNumber : null,
      )
      .sort();
    expect(numbers).toEqual([1, 2]);
  });

  it("RF-HUE-03, RN-20: registra el alta sin entrevista con el número y no registra el cambio de parámetros", async () => {
    const actorUserId = await signInAsSuperUser();
    const hospitalizationReasonOptionId = await findSeededOptionId(
      "hospitalization_reason",
      "Desgaste del cuidador principal",
    );

    const result = await createGuestManually(
      actorUserId,
      parseDetails(
        buildValidInput({
          hospitalizationReasonOptionIds: [hospitalizationReasonOptionId],
          otherHospitalizationReason: "Motivo ficticio",
        }),
      ),
    );
    if (result.status !== "success") {
      throw new Error("No se creó el huésped de prueba.");
    }

    const [guest] = await getDatabase()
      .select()
      .from(guests)
      .where(eq(guests.id, result.guestId));
    expect(guest).toMatchObject({
      clinicalRecordNumber: 1,
      origin: "manual",
      admissionInterviewId: null,
      dni: "11222333",
      createdByUserId: actorUserId,
      otherHospitalizationReason: "Motivo ficticio",
    });
    await expect(listAuditActions()).resolves.toEqual([
      "guest.created_manually",
    ]);
  });

  it("RN-02, RN-10, RF-UX-02: el servidor rechaza fecha futura, DNI inválido y obligatorios vacíos", () => {
    const errors = fieldErrorsOf(
      buildValidInput({
        hospitalizationDate: "2999-01-01",
        dni: "123456",
        firstName: " ",
        address: "",
      }),
    );

    expect(Object.keys(errors).sort()).toEqual([
      "address",
      "dni",
      "firstName",
      "hospitalizationDate",
    ]);
  });

  it("Campos del huésped (6.2): respeta los máximos de nombre, dirección, afiliado y otro motivo", () => {
    expect(
      Object.keys(
        fieldErrorsOf(
          buildValidInput({
            lastName: "a".repeat(81),
            address: "a".repeat(201),
            healthInsuranceMemberNumber: "1".repeat(41),
            otherHospitalizationReason: "a".repeat(501),
          }),
        ),
      ).sort(),
    ).toEqual([
      "address",
      "healthInsuranceMemberNumber",
      "lastName",
      "otherHospitalizationReason",
    ]);
  });

  it("RF-CAT-07: rechaza una opción inactiva sin crear el huésped ni gastar un número", async () => {
    const actorUserId = await signInAsSuperUser();
    const symptomOptionId = await findSeededOptionId(
      "uncontrolled_symptom",
      "Dolor",
    );
    await getDatabase().execute(
      sql`update catalog_options set is_active = false where id = ${symptomOptionId}`,
    );

    const result = await createGuestManually(
      actorUserId,
      parseDetails(
        buildValidInput({ uncontrolledSymptomOptionIds: [symptomOptionId] }),
      ),
    );

    expect(result).toMatchObject({
      status: "invalid",
      fieldErrors: { uncontrolledSymptomOptionIds: [expect.any(String)] },
    });
    await expect(countGuests()).resolves.toBe(0);
    await expect(readLastClinicalRecordNumber()).resolves.toBe(0);
  });

  it("R-13: avisa el DNI repetido entre huéspedes vigentes y no entre anulados", async () => {
    const actorUserId = await signInAsSuperUser();
    const result = await createGuestManually(
      actorUserId,
      parseDetails(buildValidInput()),
    );
    if (result.status !== "success") {
      throw new Error("No se creó el huésped de prueba.");
    }

    await expect(checkGuestDniAction("11.222.333")).resolves.toEqual({
      hasActiveGuest: true,
      hasPendingInterview: false,
      pendingInterviewHref: null,
    });

    await getDatabase()
      .update(guests)
      .set({ annulledAt: new Date(), annulmentReason: "Carga duplicada" })
      .where(eq(guests.id, result.guestId));

    await expect(checkGuestDniAction("11222333")).resolves.toEqual({
      hasActiveGuest: false,
      hasPendingInterview: false,
      pendingInterviewHref: null,
    });
  });

  it("CA-03, RF-ROL-08: sin permiso de alta manual el servidor rechaza sin crear nada", async () => {
    await signInAsSuperUser();
    await restrictSignedInUserTo([
      "guests.records.view",
      "guests.records.create",
    ]);

    await expect(
      createGuestManuallyAction(buildValidInput()),
    ).rejects.toMatchObject({ digest: FORBIDDEN_DIGEST });
    await expect(countGuests()).resolves.toBe(0);
    await expect(readLastClinicalRecordNumber()).resolves.toBe(0);
  });

  it("RF-HUE-03: la acción crea el huésped con permiso de alta manual", async () => {
    await signInAsSuperUser();
    await restrictSignedInUserTo(["guests.records.manual_create"]);

    await expect(
      createGuestManuallyAction(buildValidInput()),
    ).resolves.toMatchObject({ status: "success", clinicalRecordNumber: 1 });
  });
});
