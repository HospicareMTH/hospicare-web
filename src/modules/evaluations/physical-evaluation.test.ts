// @vitest-environment node

import { sql } from "drizzle-orm";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { GUEST_REJECTION_MESSAGES } from "@/modules/guests";
import { getDatabase } from "@/platform/database/client";
import { resetTestDatabase } from "@/platform/database/test-database";
import {
  FORBIDDEN_DIGEST,
  restrictSignedInUserTo,
  signInAsSuperUser,
} from "@/testing/action-session";

import {
  createPhysicalEvaluationAction,
  updatePhysicalEvaluationAction,
} from "./actions";
import {
  buildEmptyPhysicalEvaluation,
  ESAS_SYMPTOMS,
  NEUROLOGICAL_LESION_DETAIL_MISSING_MESSAGE,
  type PhysicalEvaluationInput,
  physicalEvaluationSchema,
} from "./schemas";
import {
  createPhysicalEvaluation,
  findPhysicalEvaluationOfGuest,
  PHYSICAL_EVALUATION_REJECTION_MESSAGES,
  updatePhysicalEvaluation,
} from "./service";
import { physicalAdmissionEvaluations } from "./tables";

vi.mock("next/headers", async () => {
  const session = await import("@/testing/action-session");
  return { headers: async () => session.testRequestHeaders.current };
});
vi.mock("next/cache", () => ({ refresh: vi.fn() }));

const ALL_SCORES_ZERO = Object.fromEntries(
  ESAS_SYMPTOMS.map(({ key }) => [key, 0]),
);

function buildInput(
  overrides: Partial<PhysicalEvaluationInput> = {},
): PhysicalEvaluationInput {
  return {
    ...buildEmptyPhysicalEvaluation("2026-11-20"),
    ...ALL_SCORES_ZERO,
    ...overrides,
  };
}

async function insertFictitiousGuestId(
  clinicalRecordNumber = 1,
): Promise<string> {
  const result = await getDatabase().execute<{ id: string }>(
    sql`insert into guests (
          clinical_record_number, hospitalization_date, first_name, last_name,
          birth_date, dni, address, origin
        ) values (
          ${clinicalRecordNumber}, '2026-11-12', 'Persona', 'Ficticia',
          '1950-01-01', '11222333', 'Calle Ficticia 123', 'manual'
        )
        returning id`,
  );
  const [guest] = result.rows;
  if (!guest) {
    throw new Error("No se creó el huésped de prueba.");
  }
  return guest.id;
}

async function findOptionId(catalog: string, label: string): Promise<string> {
  const result = await getDatabase().execute<{ id: string }>(
    sql`select id from catalog_options where catalog = ${catalog} and label = ${label}`,
  );
  const [option] = result.rows;
  if (!option) {
    throw new Error(`No existe la opción sembrada ${label}.`);
  }
  return option.id;
}

async function loadEvaluation(guestId: string) {
  const evaluation = await findPhysicalEvaluationOfGuest(guestId);
  if (!evaluation) {
    throw new Error("No se encontró la evaluación de prueba.");
  }
  return evaluation;
}

async function listAuditActions(guestId: string): Promise<string[]> {
  const result = await getDatabase().execute<{ action: string }>(
    sql`select action from audit_log
        where resource like 'physical_evaluation%' and resource_id = ${guestId}
        order by id`,
  );
  return result.rows.map(({ action }) => action);
}

describe("evaluación física de ingreso", () => {
  beforeEach(async () => {
    await resetTestDatabase();
    vi.stubEnv("__NEXT_EXPERIMENTAL_AUTH_INTERRUPTS", "true");
  });

  it("RF-FIS-01, RN-20: la carga con sus selecciones y lo registra", async () => {
    await signInAsSuperUser();
    const guestId = await insertFictitiousGuestId();
    const dryMouthId = await findOptionId("mouth", "Seca");
    const walkerId = await findOptionId("ambulation", "Con ayuda");

    const result = await createPhysicalEvaluationAction(
      guestId,
      buildInput({
        painScore: 6,
        painCause: "Tumoral",
        painLocation: "Lumbar",
        painIntensity: "Moderada",
        painType: "Punzante",
        ambulationOptionId: walkerId,
        mouthOptionIds: [dryMouthId],
        hasPressureUlcers: true,
        pressureUlcerStage: "II",
        pressureUlcerLocation: "Sacro",
      }),
    );

    expect(result).toEqual({ status: "success" });
    const evaluation = await loadEvaluation(guestId);
    expect(evaluation.input).toMatchObject({
      painScore: 6,
      painCause: "Tumoral",
      pressureUlcerStage: "II",
      mouthOptionIds: [dryMouthId],
    });
    expect(evaluation.optionLabels).toMatchObject({
      ambulationOptionId: ["Con ayuda"],
      mouthOptionIds: ["Seca"],
      hygieneOptionIds: [],
    });
    await expect(listAuditActions(guestId)).resolves.toEqual([
      "physical_evaluation.created",
      "physical_evaluation_mouth.created",
    ]);
  });

  it("RF-FIS-01: rechaza una segunda evaluación del mismo huésped", async () => {
    const actorUserId = await signInAsSuperUser();
    const guestId = await insertFictitiousGuestId();
    await createPhysicalEvaluationAction(guestId, buildInput());

    const result = await createPhysicalEvaluation(
      actorUserId,
      guestId,
      physicalEvaluationSchema.parse(buildInput()),
    );

    expect(result).toEqual({
      status: "rejected",
      message: PHYSICAL_EVALUATION_REJECTION_MESSAGES.alreadyExists,
    });
    await expect(
      getDatabase().$count(physicalAdmissionEvaluations),
    ).resolves.toBe(1);
  });

  it("RN-13: con la causa de sistema Lesión neurológica exige el detalle, aunque cambie su etiqueta", async () => {
    await signInAsSuperUser();
    const guestId = await insertFictitiousGuestId();
    const neurologicalLesionId = await findOptionId(
      "ambulation_cause",
      "Lesión neurológica",
    );
    await getDatabase().execute(
      sql`update catalog_options set label = 'Lesión del sistema nervioso'
          where id = ${neurologicalLesionId}`,
    );

    const result = await createPhysicalEvaluationAction(
      guestId,
      buildInput({ ambulationCauseOptionId: neurologicalLesionId }),
    );

    expect(result).toEqual({
      status: "invalid",
      fieldErrors: {
        neurologicalLesionDetail: [NEUROLOGICAL_LESION_DETAIL_MISSING_MESSAGE],
      },
    });
    await expect(findPhysicalEvaluationOfGuest(guestId)).resolves.toBeNull();
  });

  it("RN-12: con otra causa guarda vacío el detalle de la lesión neurológica", async () => {
    await signInAsSuperUser();
    const guestId = await insertFictitiousGuestId();

    await createPhysicalEvaluationAction(
      guestId,
      buildInput({
        ambulationCauseOptionId: await findOptionId(
          "ambulation_cause",
          "Progresión de la enfermedad",
        ),
        neurologicalLesionDetail: "Paresia",
      }),
    );

    await expect(loadEvaluation(guestId)).resolves.toMatchObject({
      input: { neurologicalLesionDetail: "" },
    });
  });

  it("RF-CAT-07: rechaza una opción inactiva nueva y conserva una ya guardada", async () => {
    await signInAsSuperUser();
    const guestId = await insertFictitiousGuestId();
    const dryMouthId = await findOptionId("mouth", "Seca");
    const bleedingMouthId = await findOptionId("mouth", "Sangrante");
    await createPhysicalEvaluationAction(
      guestId,
      buildInput({ mouthOptionIds: [dryMouthId] }),
    );
    await getDatabase().execute(
      sql`update catalog_options set is_active = false
          where id in (${dryMouthId}, ${bleedingMouthId})`,
    );
    const { version } = await loadEvaluation(guestId);

    const rejected = await updatePhysicalEvaluationAction(
      guestId,
      version,
      buildInput({ mouthOptionIds: [dryMouthId, bleedingMouthId] }),
    );
    const kept = await updatePhysicalEvaluationAction(
      guestId,
      version,
      buildInput({ mouthOptionIds: [dryMouthId], nauseaScore: 2 }),
    );

    expect(rejected).toMatchObject({
      status: "invalid",
      fieldErrors: { mouthOptionIds: [expect.any(String)] },
    });
    expect(kept).toEqual({ status: "success" });
  });

  it("RF-FIS-02, RN-20: al modificarla registra el valor anterior y el nuevo, y las opciones quitadas", async () => {
    await signInAsSuperUser();
    const guestId = await insertFictitiousGuestId();
    const dryMouthId = await findOptionId("mouth", "Seca");
    await createPhysicalEvaluationAction(
      guestId,
      buildInput({ mouthOptionIds: [dryMouthId] }),
    );
    const { version } = await loadEvaluation(guestId);

    const result = await updatePhysicalEvaluationAction(
      guestId,
      version,
      buildInput({ wellbeingScore: 8, carePlan: "Rotar cada 2 horas" }),
    );

    expect(result).toEqual({ status: "success" });
    await expect(listAuditActions(guestId)).resolves.toEqual([
      "physical_evaluation.created",
      "physical_evaluation_mouth.created",
      "physical_evaluation.updated",
      "physical_evaluation_mouth.deleted",
    ]);
    const changes = await getDatabase().execute<{
      previous_score: number;
      new_score: number;
    }>(
      sql`select (previous_value->>'wellbeing_score')::int as previous_score,
                 (new_value->>'wellbeing_score')::int as new_score
          from audit_log
          where action = 'physical_evaluation.updated' and resource_id = ${guestId}`,
    );
    expect(changes.rows).toEqual([{ previous_score: 0, new_score: 8 }]);
  });

  it("RF-FIS-02: rechaza los cambios si otra persona la modificó mientras tanto", async () => {
    const actorUserId = await signInAsSuperUser();
    const guestId = await insertFictitiousGuestId();
    await createPhysicalEvaluationAction(guestId, buildInput());
    const staleVersion = (await loadEvaluation(guestId)).version;
    await updatePhysicalEvaluation(
      actorUserId,
      guestId,
      staleVersion,
      physicalEvaluationSchema.parse(buildInput({ anxietyScore: 5 })),
    );

    const result = await updatePhysicalEvaluationAction(
      guestId,
      staleVersion,
      buildInput(),
    );

    expect(result).toEqual({
      status: "rejected",
      message: PHYSICAL_EVALUATION_REJECTION_MESSAGES.changedMeanwhile,
    });
  });

  it("RF-HUE-06: con el huésped anulado no se carga ni se modifica", async () => {
    const actorUserId = await signInAsSuperUser();
    const guestId = await insertFictitiousGuestId();
    await createPhysicalEvaluationAction(guestId, buildInput());
    const { version } = await loadEvaluation(guestId);
    const otherGuestId = await insertFictitiousGuestId(2);
    await getDatabase().execute(
      sql`update guests set annulled_at = now(), annulled_by_user_id = ${actorUserId},
                 annulment_reason = 'Carga duplicada por error'
          where id in (${guestId}, ${otherGuestId})`,
    );

    await expect(
      createPhysicalEvaluationAction(otherGuestId, buildInput()),
    ).resolves.toEqual({
      status: "rejected",
      message: GUEST_REJECTION_MESSAGES.annulled,
    });
    await expect(
      updatePhysicalEvaluationAction(
        guestId,
        version,
        buildInput({ painScore: 0, dyspneaScore: 9 }),
      ),
    ).resolves.toEqual({
      status: "rejected",
      message: GUEST_REJECTION_MESSAGES.annulled,
    });
  });

  it("RN-12, RN-13: la base rechaza datos del dolor sin puntaje de dolor", async () => {
    const guestId = await insertFictitiousGuestId();
    const details = physicalEvaluationSchema.parse(buildInput());

    await expect(
      getDatabase()
        .insert(physicalAdmissionEvaluations)
        .values({ guestId, ...details, painCause: "Tumoral" }),
    ).rejects.toMatchObject({
      cause: { constraint: "physical_evaluations_pain_dependency" },
    });
  });

  it("RF-ROL-08, RN-14: sin permiso de crear ni de modificar el servidor rechaza", async () => {
    await signInAsSuperUser();
    const guestId = await insertFictitiousGuestId();
    await createPhysicalEvaluationAction(guestId, buildInput());
    const { version } = await loadEvaluation(guestId);
    const otherGuestId = await insertFictitiousGuestId(2);
    await restrictSignedInUserTo([
      "guests.records.view",
      "guests.physical_evaluations.view",
    ]);

    await expect(
      createPhysicalEvaluationAction(otherGuestId, buildInput()),
    ).rejects.toMatchObject({ digest: FORBIDDEN_DIGEST });
    await expect(
      updatePhysicalEvaluationAction(guestId, version, buildInput()),
    ).rejects.toMatchObject({ digest: FORBIDDEN_DIGEST });
  });
});
