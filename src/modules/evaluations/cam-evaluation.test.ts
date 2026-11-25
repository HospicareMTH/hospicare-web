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
  createCamEvaluationAction,
  updateCamEvaluationAction,
} from "./actions";
import {
  type CamEvaluationInput,
  camEvaluationSchema,
  CRITERION_REQUIRED_MESSAGE,
} from "./schemas";
import {
  CAM_EVALUATION_REJECTION_MESSAGES,
  createCamEvaluation,
  findCamEvaluationOfGuest,
  updateCamEvaluation,
} from "./service";
import { camEvaluations } from "./tables";

vi.mock("next/headers", async () => {
  const session = await import("@/testing/action-session");
  return { headers: async () => session.testRequestHeaders.current };
});
vi.mock("next/cache", () => ({ refresh: vi.fn() }));

const WITHOUT_ACUTE_ONSET: CamEvaluationInput = {
  evaluationDate: "2026-11-20",
  acuteOnset: false,
  inattention: null,
  disorganizedThinking: null,
  alteredConsciousness: null,
  observations: "",
};

const WITH_DELIRIUM: CamEvaluationInput = {
  evaluationDate: "2026-11-21",
  acuteOnset: true,
  inattention: true,
  disorganizedThinking: false,
  alteredConsciousness: true,
  observations: "Somnoliento por la tarde",
};

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

function annulGuestDirectly(guestId: string, actorUserId: string) {
  return getDatabase().execute(
    sql`update guests set annulled_at = now(), annulled_by_user_id = ${actorUserId},
               annulment_reason = 'Carga duplicada por error'
        where id = ${guestId}`,
  );
}

async function loadEvaluation(guestId: string) {
  const evaluation = await findCamEvaluationOfGuest(guestId);
  if (!evaluation) {
    throw new Error("No se encontró la evaluación de prueba.");
  }
  return evaluation;
}

type AuditEntry = {
  action: string;
  operation: string;
  previous_result: boolean | null;
  new_result: boolean | null;
};

async function listCamAuditEntries(guestId: string): Promise<AuditEntry[]> {
  const result = await getDatabase().execute<AuditEntry>(
    sql`select action, operation,
               (previous_value->>'is_delirium_likely')::boolean as previous_result,
               (new_value->>'is_delirium_likely')::boolean as new_result
        from audit_log
        where resource = 'cam_evaluation' and resource_id = ${guestId}
        order by id`,
  );
  return result.rows;
}

describe("evaluación CAM", () => {
  beforeEach(async () => {
    await resetTestDatabase();
    vi.stubEnv("__NEXT_EXPERIMENTAL_AUTH_INTERRUPTS", "true");
  });

  it("CA-11, RF-CAM-01, RN-20: sin comienzo agudo guarda que se detuvo ahí, sin delirium probable, y lo registra como alta", async () => {
    await signInAsSuperUser();
    const guestId = await insertFictitiousGuestId();

    const result = await createCamEvaluationAction(guestId, {
      ...WITHOUT_ACUTE_ONSET,
      inattention: true,
    });

    expect(result).toEqual({ status: "success" });
    const evaluation = await loadEvaluation(guestId);
    expect(evaluation).toMatchObject({
      input: { ...WITHOUT_ACUTE_ONSET, inattention: null },
      isDeliriumLikely: false,
      stoppedAtCriterion: "acute_onset",
      createdByName: "Ana Prueba",
    });
    await expect(listCamAuditEntries(guestId)).resolves.toEqual([
      {
        action: "cam_evaluation.created",
        operation: "create",
        previous_result: null,
        new_result: false,
      },
    ]);
  });

  it("CA-21, RF-CAM-01: rechaza una segunda evaluación del mismo huésped", async () => {
    const actorUserId = await signInAsSuperUser();
    const guestId = await insertFictitiousGuestId();
    await createCamEvaluationAction(guestId, WITHOUT_ACUTE_ONSET);

    const result = await createCamEvaluation(
      actorUserId,
      guestId,
      camEvaluationSchema.parse(WITH_DELIRIUM),
    );

    expect(result).toEqual({
      status: "rejected",
      message: CAM_EVALUATION_REJECTION_MESSAGES.alreadyExists,
    });
    const count = await getDatabase().$count(camEvaluations);
    expect(count).toBe(1);
  });

  it("CA-21: si dos personas la cargan a la vez, queda una sola", async () => {
    const actorUserId = await signInAsSuperUser();
    const guestId = await insertFictitiousGuestId();
    const details = camEvaluationSchema.parse(WITHOUT_ACUTE_ONSET);

    const results = await Promise.all([
      createCamEvaluation(actorUserId, guestId, details),
      createCamEvaluation(actorUserId, guestId, details),
    ]);

    expect(results.map(({ status }) => status).sort()).toEqual([
      "rejected",
      "success",
    ]);
    await expect(getDatabase().$count(camEvaluations)).resolves.toBe(1);
  });

  it("RF-CAM-04, RN-20: al modificarla recalcula el resultado y registra el valor anterior y el nuevo", async () => {
    await signInAsSuperUser();
    const guestId = await insertFictitiousGuestId();
    await createCamEvaluationAction(guestId, WITHOUT_ACUTE_ONSET);
    const saved = await loadEvaluation(guestId);

    const result = await updateCamEvaluationAction(
      guestId,
      saved.version,
      WITH_DELIRIUM,
    );

    expect(result).toEqual({ status: "success" });
    await expect(loadEvaluation(guestId)).resolves.toMatchObject({
      input: WITH_DELIRIUM,
      isDeliriumLikely: true,
      stoppedAtCriterion: null,
      updatedByName: "Ana Prueba",
    });
    const auditEntries = await listCamAuditEntries(guestId);
    expect(auditEntries.at(-1)).toEqual({
      action: "cam_evaluation.updated",
      operation: "update",
      previous_result: false,
      new_result: true,
    });
  });

  it("RF-CAM-04: rechaza los cambios si otra persona la modificó mientras tanto", async () => {
    const actorUserId = await signInAsSuperUser();
    const guestId = await insertFictitiousGuestId();
    await createCamEvaluationAction(guestId, WITHOUT_ACUTE_ONSET);
    const staleVersion = (await loadEvaluation(guestId)).version;
    await updateCamEvaluation(
      actorUserId,
      guestId,
      staleVersion,
      camEvaluationSchema.parse(WITH_DELIRIUM),
    );

    const result = await updateCamEvaluationAction(
      guestId,
      staleVersion,
      WITHOUT_ACUTE_ONSET,
    );

    expect(result).toEqual({
      status: "rejected",
      message: CAM_EVALUATION_REJECTION_MESSAGES.changedMeanwhile,
    });
    await expect(loadEvaluation(guestId)).resolves.toMatchObject({
      isDeliriumLikely: true,
    });
  });

  it("RN-13: la acción rechaza un criterio alcanzado sin responder, junto al campo", async () => {
    await signInAsSuperUser();
    const guestId = await insertFictitiousGuestId();

    const result = await createCamEvaluationAction(guestId, {
      ...WITH_DELIRIUM,
      inattention: null,
    });

    expect(result).toEqual({
      status: "invalid",
      fieldErrors: { inattention: [CRITERION_REQUIRED_MESSAGE] },
    });
    await expect(findCamEvaluationOfGuest(guestId)).resolves.toBeNull();
  });

  it("RF-HUE-06: con el huésped anulado no se carga ni se modifica", async () => {
    const actorUserId = await signInAsSuperUser();
    const guestId = await insertFictitiousGuestId();
    await createCamEvaluationAction(guestId, WITHOUT_ACUTE_ONSET);
    const { version } = await loadEvaluation(guestId);
    const annulledGuestId = await insertFictitiousGuestId(2);
    await annulGuestDirectly(annulledGuestId, actorUserId);
    await annulGuestDirectly(guestId, actorUserId);

    await expect(
      createCamEvaluationAction(annulledGuestId, WITHOUT_ACUTE_ONSET),
    ).resolves.toEqual({
      status: "rejected",
      message: GUEST_REJECTION_MESSAGES.annulled,
    });
    await expect(
      updateCamEvaluationAction(guestId, version, WITH_DELIRIUM),
    ).resolves.toEqual({
      status: "rejected",
      message: GUEST_REJECTION_MESSAGES.annulled,
    });
    await expect(findCamEvaluationOfGuest(annulledGuestId)).resolves.toBeNull();
    await expect(loadEvaluation(guestId)).resolves.toMatchObject({
      isDeliriumLikely: false,
    });
  });

  it("RF-CAM-01: rechaza un huésped que no existe", async () => {
    await signInAsSuperUser();

    await expect(
      createCamEvaluationAction(
        "00000000-0000-4000-8000-000000000001",
        WITHOUT_ACUTE_ONSET,
      ),
    ).resolves.toEqual({
      status: "rejected",
      message: GUEST_REJECTION_MESSAGES.notFound,
    });
  });

  it("RF-CAM-02, RF-CAM-03: la base rechaza un resultado que no sigue a los criterios", async () => {
    const guestId = await insertFictitiousGuestId();

    await expect(
      getDatabase().insert(camEvaluations).values({
        guestId,
        evaluationDate: "2026-11-20",
        acuteOnset: true,
        inattention: true,
        disorganizedThinking: false,
        alteredConsciousness: false,
        isDeliriumLikely: true,
        stoppedAtCriterion: null,
      }),
    ).rejects.toMatchObject({
      cause: { constraint: "cam_evaluations_criteria_consistency" },
    });
  });

  it("RF-ROL-08, RN-14: sin permiso de crear ni de modificar evaluaciones CAM el servidor rechaza", async () => {
    await signInAsSuperUser();
    const guestId = await insertFictitiousGuestId();
    await createCamEvaluationAction(guestId, WITHOUT_ACUTE_ONSET);
    const { version } = await loadEvaluation(guestId);
    const otherGuestId = await insertFictitiousGuestId(2);
    await restrictSignedInUserTo([
      "guests.records.view",
      "guests.cam_evaluations.view",
    ]);

    await expect(
      createCamEvaluationAction(otherGuestId, WITHOUT_ACUTE_ONSET),
    ).rejects.toMatchObject({ digest: FORBIDDEN_DIGEST });
    await expect(
      updateCamEvaluationAction(guestId, version, WITH_DELIRIUM),
    ).rejects.toMatchObject({ digest: FORBIDDEN_DIGEST });
    await expect(findCamEvaluationOfGuest(otherGuestId)).resolves.toBeNull();
    await expect(loadEvaluation(guestId)).resolves.toMatchObject({
      isDeliriumLikely: false,
    });
  });
});
