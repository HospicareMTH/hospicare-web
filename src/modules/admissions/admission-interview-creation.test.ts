// @vitest-environment node

import { sql } from "drizzle-orm";
import { z } from "zod";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { getDatabase } from "@/platform/database/client";
import { resetTestDatabase } from "@/platform/database/test-database";

import {
  admissionInterviewDetailsSchema,
  type AdmissionInterviewDetailsInput,
} from "./schemas";
import { createAdmissionInterview, isDniInActiveInterview } from "./service";
import {
  buildValidInput,
  createActorUserId,
  deactivateCatalogOption,
  findSeededOptionId,
  insertCatalogOption,
  insertHealthcareProfessional,
  insertInterview,
  parseDetails,
} from "./test-fixtures";

function fieldErrorsOf(input: AdmissionInterviewDetailsInput) {
  const result = admissionInterviewDetailsSchema.safeParse(input);
  return result.success ? {} : z.flattenError(result.error).fieldErrors;
}

describe("admisiones: esquema de la entrevista", () => {
  beforeEach(async () => {
    await resetTestDatabase();
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-11-16T15:00:00Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("CA-06: rechaza un DNI de 6 dígitos junto al campo", async () => {
    expect(
      fieldErrorsOf(await buildValidInput({ guestDni: "123456" })).guestDni,
    ).toEqual([
      "El DNI debe tener 7 u 8 números, entre 1.000.000 y 99.999.999.",
    ]);
  });

  it("CA-07, RN-02: rechaza una fecha de entrevista posterior a hoy en Buenos Aires", async () => {
    expect(
      fieldErrorsOf(await buildValidInput({ interviewDate: "2026-11-17" }))
        .interviewDate,
    ).toEqual(["La fecha de entrevista no puede ser posterior a hoy."]);
  });

  it("RN-13: con metástasis exige el lugar, y con opioides exige el opioide", async () => {
    const fieldErrors = fieldErrorsOf(
      await buildValidInput({ hasMetastasis: true, hasOpioidTreatment: true }),
    );

    expect(fieldErrors.metastasisLocationOptionId).toEqual([
      "Elegí el lugar de la metástasis.",
    ]);
    expect(fieldErrors.opioid).toEqual(["Escribí qué opioide recibe."]);
  });

  it("RN-12: sin metástasis ni opioides guarda vacíos sus datos dependientes", async () => {
    const locationOptionId = await insertCatalogOption(
      "metastasis_location",
      "Lugar ficticio",
    );

    const details = parseDetails(
      await buildValidInput({
        metastasisLocationOptionId: locationOptionId,
        opioid: "Opioide ficticio",
      }),
    );

    expect(details.metastasisLocationOptionId).toBeNull();
    expect(details.opioid).toBeNull();
  });

  it("RF-ENT-02: exige los campos obligatorios con un mensaje para cada uno", async () => {
    const fieldErrors = fieldErrorsOf(
      await buildValidInput({
        guestFirstName: "",
        religionOptionId: "",
        intervieweeFullName: "A",
      }),
    );

    expect(fieldErrors.guestFirstName).toEqual([
      "El nombre debe tener al menos 2 caracteres.",
    ]);
    expect(fieldErrors.religionOptionId).toEqual(["Elegí la religión."]);
    expect(fieldErrors.intervieweeFullName).toEqual([
      "El nombre y apellido del entrevistado debe tener al menos 2 caracteres.",
    ]);
  });
});

describe("admisiones: alta de entrevista", () => {
  beforeEach(async () => {
    await resetTestDatabase();
  });

  it("RF-ENT-02, RN-20: guarda la entrevista con sus cirugías y deja el alta en el registro de actividad", async () => {
    const actorUserId = await createActorUserId();
    const surgeryOptionId = await insertCatalogOption(
      "surgery",
      "Cirugía ficticia",
    );

    const result = await createAdmissionInterview(
      actorUserId,
      parseDetails(
        await buildValidInput({ surgeryOptionIds: [surgeryOptionId] }),
      ),
    );

    expect(result.status).toBe("success");
    if (result.status !== "success") {
      return;
    }
    const auditEntries = await getDatabase().execute<{
      action: string;
      actor_user_id: string;
    }>(
      sql`select action, actor_user_id from audit_log
          where resource_id = ${result.interviewId} order by id`,
    );
    expect(auditEntries.rows).toEqual([
      { action: "admission_interview.created", actor_user_id: actorUserId },
      {
        action: "admission_interview_surgery.created",
        actor_user_id: actorUserId,
      },
    ]);
    const stored = await getDatabase().execute<{
      guest_dni: string;
      created_by_user_id: string;
    }>(
      sql`select guest_dni, created_by_user_id from admission_interviews
          where id = ${result.interviewId}`,
    );
    expect(stored.rows).toEqual([
      { guest_dni: "11222333", created_by_user_id: actorUserId },
    ]);
  });

  it("RF-ENT-02: con la religión Otra exige el detalle, y con otra religión lo descarta", async () => {
    const actorUserId = await createActorUserId();
    const otherReligionId = await findSeededOptionId("religion", "Otra");

    const withoutDetail = await createAdmissionInterview(
      actorUserId,
      parseDetails(
        await buildValidInput({ religionOptionId: otherReligionId }),
      ),
    );
    const withDetailButNotOther = await createAdmissionInterview(
      actorUserId,
      parseDetails(
        await buildValidInput({ religionDetail: "Detalle ficticio" }),
      ),
    );

    expect(withoutDetail).toEqual({
      status: "invalid",
      fieldErrors: { religionDetail: ["Escribí cuál es la otra religión."] },
    });
    expect(withDetailButNotOther.status).toBe("success");
    const stored = await getDatabase().execute<{ religion_detail: null }>(
      sql`select religion_detail from admission_interviews`,
    );
    expect(stored.rows).toEqual([{ religion_detail: null }]);
  });

  it("RF-CAT-07: rechaza opciones y profesionales inactivos junto a su campo", async () => {
    const actorUserId = await createActorUserId();
    const otherRelationshipId = await findSeededOptionId(
      "relationship",
      "Otro",
    );
    await deactivateCatalogOption(otherRelationshipId);
    const formerDoctorId = await insertHealthcareProfessional(
      "Médico Anterior Ficticio",
      false,
    );

    const result = await createAdmissionInterview(
      actorUserId,
      parseDetails(
        await buildValidInput({
          intervieweeRelationshipOptionId: otherRelationshipId,
          primaryDoctorId: formerDoctorId,
        }),
      ),
    );

    expect(result.status).toBe("invalid");
    if (result.status !== "invalid") {
      return;
    }
    expect(result.fieldErrors.intervieweeRelationshipOptionId).toEqual([
      "La opción «Otro» ya no está disponible. Elegí otra.",
    ]);
    expect(result.fieldErrors.primaryDoctorId).toEqual([
      "La opción «Médico Anterior Ficticio» ya no está disponible. Elegí otra.",
    ]);
    const stored = await getDatabase().execute(
      sql`select id from admission_interviews`,
    );
    expect(stored.rows).toEqual([]);
  });

  it("RF-ENT-02, R-13: avisa si el DNI ya está en una entrevista vigente, sin contar las anuladas", async () => {
    await insertInterview({ guestDni: "30111222" });
    await insertInterview({
      guestDni: "30333444",
      annulledAt: new Date(),
      annulmentReason: "Motivo ficticio",
    });

    expect(await isDniInActiveInterview("30111222", null)).toBe(true);
    expect(await isDniInActiveInterview("30333444", null)).toBe(false);
  });
});
