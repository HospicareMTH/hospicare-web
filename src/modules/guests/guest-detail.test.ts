// @vitest-environment node

import { sql } from "drizzle-orm";
import { beforeEach, describe, expect, it } from "vitest";

import { getDatabase } from "@/platform/database/client";
import { resetTestDatabase } from "@/platform/database/test-database";
import {
  FICTITIOUS_SUPER_USER,
  signInAsSuperUser,
} from "@/testing/action-session";

import { buildEmptyGuest, guestDetailsSchema } from "./schemas";
import { createGuestManually, findGuest } from "./service";
import { findSeededOptionId } from "./test-fixtures";

describe("huéspedes: ficha", () => {
  beforeEach(async () => {
    await resetTestDatabase();
  });

  it("RF-HUE-04, RF-CAT-02: trae los datos, las etiquetas de catálogo aunque estén desactivadas y quién cargó", async () => {
    const actorUserId = await signInAsSuperUser();
    const symptomOptionId = await findSeededOptionId(
      "uncontrolled_symptom",
      "Dolor",
    );
    const created = await createGuestManually(
      actorUserId,
      guestDetailsSchema.parse({
        ...buildEmptyGuest("2026-11-20"),
        firstName: "Persona",
        lastName: "Ficticia",
        birthDate: "1950-01-01",
        dni: "11.222.333",
        address: "Calle Ficticia 123",
        healthInsuranceOptionId: await findSeededOptionId(
          "health_insurance",
          "OSDE",
        ),
        uncontrolledSymptomOptionIds: [symptomOptionId],
      }),
    );
    if (created.status !== "success") {
      throw new Error("No se creó el huésped de prueba.");
    }
    await getDatabase().execute(
      sql`update catalog_options set is_active = false where id = ${symptomOptionId}`,
    );

    const guest = await findGuest(created.guestId);

    expect(guest).toMatchObject({
      clinicalRecordNumber: 1,
      fullName: "Persona Ficticia",
      dni: "11222333",
      healthInsuranceLabel: "OSDE",
      hospitalizationReasonLabels: [],
      otherHospitalizationReason: null,
      uncontrolledSymptomLabels: ["Dolor"],
      origin: "manual",
      admissionInterviewId: null,
      createdByName: FICTITIOUS_SUPER_USER.name,
      annulment: null,
    });
  });

  it.each(["no-es-un-id", "00000000-0000-4000-8000-000000000000"])(
    "RF-ROL-09: un id inexistente o mal formado (%s) no encuentra huésped",
    async (candidateId) => {
      await expect(findGuest(candidateId)).resolves.toBeNull();
    },
  );
});
