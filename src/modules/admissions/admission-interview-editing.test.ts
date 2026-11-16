// @vitest-environment node

import { sql } from "drizzle-orm";
import { beforeEach, describe, expect, it } from "vitest";

import { getDatabase } from "@/platform/database/client";
import { resetTestDatabase } from "@/platform/database/test-database";

import {
  ADMISSION_INTERVIEW_REJECTION_MESSAGES,
  createAdmissionInterview,
  findAdmissionInterview,
  isDniInActiveInterview,
  updateAdmissionInterview,
} from "./service";
import {
  buildValidInput,
  createActorUserId,
  deactivateCatalogOption,
  findSeededOptionId,
  insertCatalogOption,
  parseDetails,
} from "./test-fixtures";
import type { AdmissionInterviewDetailsInput } from "./schemas";

async function createInterview(
  actorUserId: string,
  overrides: Partial<AdmissionInterviewDetailsInput> = {},
): Promise<string> {
  const result = await createAdmissionInterview(
    actorUserId,
    parseDetails(await buildValidInput(overrides)),
  );
  if (result.status !== "success") {
    throw new Error("No se creó la entrevista de prueba.");
  }
  return result.interviewId;
}

async function loadView(interviewId: string) {
  const view = await findAdmissionInterview(interviewId);
  if (!view) {
    throw new Error("No se encontró la entrevista de prueba.");
  }
  return view;
}

async function listAuditActions(interviewId: string): Promise<string[]> {
  const result = await getDatabase().execute<{ action: string }>(
    sql`select action from audit_log where resource_id = ${interviewId} order by id`,
  );
  return result.rows.map(({ action }) => action);
}

describe("admisiones: detalle y edición", () => {
  beforeEach(async () => {
    await resetTestDatabase();
  });

  it("RF-ENT-03: devuelve la entrevista con quién la cargó", async () => {
    const actorUserId = await createActorUserId();
    const interviewId = await createInterview(actorUserId);

    const view = await loadView(interviewId);

    expect(view.details).toMatchObject({
      guestFirstName: "Persona",
      guestDni: "11222333",
      healthInsuranceOptionId: "",
      surgeryOptionIds: [],
    });
    expect(view.createdByName).toBe("Ana Prueba");
    expect(view.updatedByName).toBe("Ana Prueba");
    expect(view.isAnnulled).toBe(false);
  });

  it("RF-ENT-03: una dirección con un id inválido o inexistente no encuentra nada", async () => {
    expect(await findAdmissionInterview("no-es-un-id")).toBeNull();
    expect(
      await findAdmissionInterview("00000000-0000-4000-8000-000000000000"),
    ).toBeNull();
  });

  it("RF-ENT-04, RN-20, R-02: guarda los cambios y deja el valor anterior y nuevo, también de las cirugías", async () => {
    const actorUserId = await createActorUserId();
    const firstSurgeryId = await insertCatalogOption("surgery", "Cirugía uno");
    const secondSurgeryId = await insertCatalogOption("surgery", "Cirugía dos");
    const interviewId = await createInterview(actorUserId, {
      surgeryOptionIds: [firstSurgeryId],
    });
    const view = await loadView(interviewId);

    const result = await updateAdmissionInterview(
      actorUserId,
      interviewId,
      view.version,
      parseDetails({
        ...view.details,
        guestAddress: "Otra Calle Ficticia 456",
        surgeryOptionIds: [secondSurgeryId],
      }),
    );

    expect(result).toEqual({ status: "success" });
    expect((await loadView(interviewId)).details).toMatchObject({
      guestAddress: "Otra Calle Ficticia 456",
      surgeryOptionIds: [secondSurgeryId],
    });
    expect(await listAuditActions(interviewId)).toEqual([
      "admission_interview.created",
      "admission_interview_surgery.created",
      "admission_interview.updated",
      "admission_interview_surgery.deleted",
      "admission_interview_surgery.created",
    ]);
    const updateEntry = await getDatabase().execute<{
      previous_address: string;
      new_address: string;
    }>(
      sql`select previous_value->>'guest_address' as previous_address,
                 new_value->>'guest_address' as new_address
          from audit_log
          where resource_id = ${interviewId} and action = 'admission_interview.updated'`,
    );
    expect(updateEntry.rows).toEqual([
      {
        previous_address: "Calle Ficticia 123",
        new_address: "Otra Calle Ficticia 456",
      },
    ]);
  });

  it("RF-ENT-04, RF-CAT-07: conserva una opción ya elegida aunque se haya desactivado, pero no acepta una inactiva nueva", async () => {
    const actorUserId = await createActorUserId();
    const daughterId = await findSeededOptionId("relationship", "Hija/o");
    const otherId = await findSeededOptionId("relationship", "Otro");
    const interviewId = await createInterview(actorUserId, {
      intervieweeRelationshipOptionId: daughterId,
    });
    await deactivateCatalogOption(daughterId);
    await deactivateCatalogOption(otherId);
    const view = await loadView(interviewId);

    const keepingInactive = await updateAdmissionInterview(
      actorUserId,
      interviewId,
      view.version,
      parseDetails({ ...view.details, guestAddress: "Calle Nueva 1" }),
    );
    const choosingInactive = await updateAdmissionInterview(
      actorUserId,
      interviewId,
      (await loadView(interviewId)).version,
      parseDetails({
        ...view.details,
        intervieweeRelationshipOptionId: otherId,
      }),
    );

    expect(keepingInactive).toEqual({ status: "success" });
    expect(choosingInactive).toEqual({
      status: "invalid",
      fieldErrors: {
        intervieweeRelationshipOptionId: [
          "La opción «Otro» ya no está disponible. Elegí otra.",
        ],
      },
    });
  });

  it("RF-ENT-04: rechaza el guardado si otra persona cambió la entrevista mientras tanto", async () => {
    const actorUserId = await createActorUserId();
    const interviewId = await createInterview(actorUserId);
    const openedView = await loadView(interviewId);
    await updateAdmissionInterview(
      actorUserId,
      interviewId,
      openedView.version,
      parseDetails({ ...openedView.details, guestAddress: "Primera edición" }),
    );

    const result = await updateAdmissionInterview(
      actorUserId,
      interviewId,
      openedView.version,
      parseDetails({ ...openedView.details, guestAddress: "Segunda edición" }),
    );

    expect(result).toEqual({
      status: "rejected",
      message: ADMISSION_INTERVIEW_REJECTION_MESSAGES.changedMeanwhile,
    });
    expect((await loadView(interviewId)).details.guestAddress).toBe(
      "Primera edición",
    );
  });

  it("RN-04, 8.2: una entrevista anulada se puede ver pero no modificar", async () => {
    const actorUserId = await createActorUserId();
    const interviewId = await createInterview(actorUserId);
    await getDatabase().execute(
      sql`update admission_interviews
          set annulled_at = now(), annulment_reason = 'Motivo ficticio'
          where id = ${interviewId}`,
    );
    const view = await loadView(interviewId);

    const result = await updateAdmissionInterview(
      actorUserId,
      interviewId,
      view.version,
      parseDetails({ ...view.details, guestAddress: "Calle Nueva 1" }),
    );

    expect(view.isAnnulled).toBe(true);
    expect(result).toEqual({
      status: "rejected",
      message: ADMISSION_INTERVIEW_REJECTION_MESSAGES.annulled,
    });
  });

  it("RF-ENT-02: el aviso de DNI repetido no cuenta la propia entrevista", async () => {
    const actorUserId = await createActorUserId();
    const interviewId = await createInterview(actorUserId);

    expect(await isDniInActiveInterview("11222333", interviewId)).toBe(false);
    expect(await isDniInActiveInterview("11222333", null)).toBe(true);
  });
});
