// @vitest-environment node

import { eq, sql } from "drizzle-orm";
import { beforeEach, describe, expect, it } from "vitest";

import { PERMISSION_GROUPS } from "@/modules/access";
import { getDatabase, runInTransactionAs } from "@/platform/database/client";
import { resetTestDatabase } from "@/platform/database/test-database";

import { admissionInterviews, admissionInterviewSurgeries } from "./tables";
import {
  buildFictitiousInterview,
  createActorUserId,
  insertCatalogOption,
  insertInterview,
} from "./test-fixtures";

const CHECK_VIOLATION = { cause: { code: "23514" } };
const PERMISSION_DENIED = { cause: { code: "42501" } };
type AuditEntry = {
  action: string;
  operation: string;
  resource: string;
  actor_user_id: string | null;
  previous_value: Record<string, unknown> | null;
  new_value: Record<string, unknown> | null;
};

async function listInterviewAuditEntries(
  interviewId: string,
): Promise<AuditEntry[]> {
  const result = await getDatabase().execute<AuditEntry>(
    sql`select action, operation, resource, actor_user_id, previous_value, new_value
        from audit_log
        where resource_id = ${interviewId}
        order by id`,
  );
  return result.rows;
}

describe("admisiones: base", () => {
  beforeEach(async () => {
    await resetTestDatabase();
  });

  it("RF-ENT-02: reconoce la opción Otra de Religión por su clave de sistema", async () => {
    const result = await getDatabase().execute<{
      label: string;
      system_key: string | null;
    }>(
      sql`select label, system_key from catalog_options where catalog = 'religion'`,
    );

    expect(result.rows.filter((option) => option.system_key !== null)).toEqual([
      { label: "Otra", system_key: "religion_other" },
    ]);
  });

  it("RN-20, R-02: registra alta, edición y anulación con responsable y valores anterior y nuevo", async () => {
    const actorUserId = await createActorUserId();
    const interview = await buildFictitiousInterview();
    const interviewId = await runInTransactionAs(
      actorUserId,
      async (transaction) => {
        const [created] = await transaction
          .insert(admissionInterviews)
          .values(interview)
          .returning({ id: admissionInterviews.id });
        if (!created) {
          throw new Error("No se creó la entrevista de prueba.");
        }
        const byId = eq(admissionInterviews.id, created.id);
        await transaction
          .update(admissionInterviews)
          .set({ guestAddress: "Otra Calle Ficticia 456" })
          .where(byId);
        await transaction
          .update(admissionInterviews)
          .set({
            annulledAt: new Date(),
            annulledByUserId: actorUserId,
            annulmentReason: "Carga duplicada de prueba",
          })
          .where(byId);
        return created.id;
      },
    );

    const entries = await listInterviewAuditEntries(interviewId);

    expect(
      entries.map(({ action, operation }) => ({ action, operation })),
    ).toEqual([
      { action: "admission_interview.created", operation: "create" },
      { action: "admission_interview.updated", operation: "update" },
      { action: "admission_interview.annulled", operation: "delete" },
    ]);
    expect(entries.every((entry) => entry.actor_user_id === actorUserId)).toBe(
      true,
    );
    expect(entries[1]?.previous_value?.guest_address).toBe(
      "Calle Ficticia 123",
    );
    expect(entries[1]?.new_value?.guest_address).toBe(
      "Otra Calle Ficticia 456",
    );
    expect(entries[2]?.new_value?.annulment_reason).toBe(
      "Carga duplicada de prueba",
    );
  });

  it("RN-20: registra las cirugías agregadas y quitadas bajo la entrevista", async () => {
    const actorUserId = await createActorUserId();
    const surgeryOptionId = await insertCatalogOption(
      "surgery",
      "Cirugía ficticia",
    );
    const [interview] = await insertInterview();
    if (!interview) {
      throw new Error("No se creó la entrevista de prueba.");
    }

    await runInTransactionAs(actorUserId, async (transaction) => {
      await transaction
        .insert(admissionInterviewSurgeries)
        .values({ admissionInterviewId: interview.id, surgeryOptionId });
      await transaction
        .delete(admissionInterviewSurgeries)
        .where(
          eq(admissionInterviewSurgeries.admissionInterviewId, interview.id),
        );
    });

    const surgeryEntries = (await listInterviewAuditEntries(interview.id))
      .filter((entry) => entry.resource === "admission_interview_surgery")
      .map(({ action, actor_user_id, previous_value, new_value }) => ({
        action,
        actor_user_id,
        surgeryOptionId:
          (new_value ?? previous_value)?.surgery_option_id ?? null,
      }));

    expect(surgeryEntries).toEqual([
      {
        action: "admission_interview_surgery.created",
        actor_user_id: actorUserId,
        surgeryOptionId,
      },
      {
        action: "admission_interview_surgery.deleted",
        actor_user_id: actorUserId,
        surgeryOptionId,
      },
    ]);
  });

  it("RN-04: la aplicación no puede borrar entrevistas físicamente", async () => {
    await insertInterview();

    await expect(
      getDatabase().execute(sql`delete from admission_interviews`),
    ).rejects.toMatchObject(PERMISSION_DENIED);
  });

  it.each(["123456", "123456789", "01234567", "1234567a"])(
    "RN-10, CA-06: la base rechaza el DNI %j",
    async (guestDni) => {
      await expect(insertInterview({ guestDni })).rejects.toMatchObject(
        CHECK_VIOLATION,
      );
    },
  );

  it("RN-12, RN-13: el lugar de metástasis existe si y solo si hay metástasis", async () => {
    const locationOptionId = await insertCatalogOption(
      "metastasis_location",
      "Lugar ficticio",
    );

    await expect(
      insertInterview({ metastasisLocationOptionId: locationOptionId }),
    ).rejects.toMatchObject(CHECK_VIOLATION);
    await expect(
      insertInterview({ hasMetastasis: true }),
    ).rejects.toMatchObject(CHECK_VIOLATION);
    await expect(
      insertInterview({
        hasMetastasis: true,
        metastasisLocationOptionId: locationOptionId,
      }),
    ).resolves.toHaveLength(1);
  });

  it("RN-12, RN-13: el opioide existe si y solo si hay tratamiento con opioides", async () => {
    await expect(
      insertInterview({ opioid: "Opioide ficticio" }),
    ).rejects.toMatchObject(CHECK_VIOLATION);
    await expect(
      insertInterview({ hasOpioidTreatment: true }),
    ).rejects.toMatchObject(CHECK_VIOLATION);
    await expect(
      insertInterview({ hasOpioidTreatment: true, opioid: "Opioide ficticio" }),
    ).resolves.toHaveLength(1);
  });

  it("RN-04: una anulación exige fecha y motivo juntos", async () => {
    await expect(
      insertInterview({ annulledAt: new Date() }),
    ).rejects.toMatchObject(CHECK_VIOLATION);
    await expect(
      insertInterview({ annulmentReason: "Motivo ficticio" }),
    ).rejects.toMatchObject(CHECK_VIOLATION);
  });

  it("sección 5.1: declara ver, crear, modificar y anular entrevistas", () => {
    const admissionsGroup = PERMISSION_GROUPS.find(
      (group) => group.key === "admissions",
    );

    expect(
      admissionsGroup?.permissions.map((permission) => permission.key),
    ).toEqual([
      "admissions.interviews.view",
      "admissions.interviews.create",
      "admissions.interviews.update",
      "admissions.interviews.annul",
    ]);
  });
});
