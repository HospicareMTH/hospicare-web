// @vitest-environment node

import { eq, sql } from "drizzle-orm";
import { beforeEach, describe, expect, it } from "vitest";

import { PERMISSION_GROUPS } from "@/modules/access";
import { getDatabase, runInTransactionAs } from "@/platform/database/client";
import { resetTestDatabase } from "@/platform/database/test-database";

import {
  guestHospitalizationReasons,
  guests,
  guestUncontrolledSymptoms,
} from "./tables";
import {
  buildFictitiousGuest,
  createActorUserId,
  findSeededOptionId,
  insertFictitiousInterviewId,
  insertGuest,
} from "./test-fixtures";

const CHECK_VIOLATION = { cause: { code: "23514" } };
const UNIQUE_VIOLATION = { cause: { code: "23505" } };
const PERMISSION_DENIED = { cause: { code: "42501" } };

type AuditEntry = {
  action: string;
  operation: string;
  resource: string;
  actor_user_id: string | null;
  previous_value: Record<string, unknown> | null;
  new_value: Record<string, unknown> | null;
};

async function listGuestAuditEntries(guestId: string): Promise<AuditEntry[]> {
  const result = await getDatabase().execute<AuditEntry>(
    sql`select action, operation, resource, actor_user_id, previous_value, new_value
        from audit_log
        where resource_id = ${guestId}
        order by id`,
  );
  return result.rows;
}

describe("huéspedes: base", () => {
  beforeEach(async () => {
    await resetTestDatabase();
  });

  it("RF-HUE-07: el número de historia clínica es único", async () => {
    await insertGuest({ clinicalRecordNumber: 7 });

    await expect(
      insertGuest({ clinicalRecordNumber: 7, dni: "22333444" }),
    ).rejects.toMatchObject(UNIQUE_VIOLATION);
  });

  it.each([0, -1])(
    "RF-HUE-07: la base rechaza el número de historia clínica %j",
    async (clinicalRecordNumber) => {
      await expect(insertGuest({ clinicalRecordNumber })).rejects.toMatchObject(
        CHECK_VIOLATION,
      );
    },
  );

  it.each(["123456", "123456789", "01234567", "1234567a"])(
    "RN-10: la base rechaza el DNI %j",
    async (dni) => {
      await expect(insertGuest({ dni })).rejects.toMatchObject(CHECK_VIOLATION);
    },
  );

  it("RF-HUE-02: el origen admisión exige la entrevista y el manual no la admite", async () => {
    const admissionInterviewId = await insertFictitiousInterviewId();

    await expect(insertGuest({ origin: "admission" })).rejects.toMatchObject(
      CHECK_VIOLATION,
    );
    await expect(
      insertGuest({ origin: "manual", admissionInterviewId }),
    ).rejects.toMatchObject(CHECK_VIOLATION);
    await expect(
      insertGuest({ origin: "admission", admissionInterviewId }),
    ).resolves.toHaveLength(1);
  });

  it("R-14: una entrevista admite otro huésped solo si el anterior está anulado", async () => {
    const admissionInterviewId = await insertFictitiousInterviewId();
    const [firstGuest] = await insertGuest({
      origin: "admission",
      admissionInterviewId,
    });
    if (!firstGuest) {
      throw new Error("No se creó el huésped de prueba.");
    }

    await expect(
      insertGuest({
        clinicalRecordNumber: 2,
        origin: "admission",
        admissionInterviewId,
      }),
    ).rejects.toMatchObject(UNIQUE_VIOLATION);

    await getDatabase()
      .update(guests)
      .set({ annulledAt: new Date(), annulmentReason: "Carga duplicada" })
      .where(eq(guests.id, firstGuest.id));

    await expect(
      insertGuest({
        clinicalRecordNumber: 2,
        origin: "admission",
        admissionInterviewId,
      }),
    ).resolves.toHaveLength(1);
  });

  it("RN-04: la anulación exige fecha y motivo juntos", async () => {
    await expect(insertGuest({ annulledAt: new Date() })).rejects.toMatchObject(
      CHECK_VIOLATION,
    );
    await expect(
      insertGuest({ annulmentReason: "Motivo sin fecha" }),
    ).rejects.toMatchObject(CHECK_VIOLATION);
  });

  it("RN-04: la aplicación no puede borrar huéspedes físicamente", async () => {
    await insertGuest();

    await expect(
      getDatabase().execute(sql`delete from guests`),
    ).rejects.toMatchObject(PERMISSION_DENIED);
  });

  it("RF-HUE-02, RF-HUE-03, RN-20: distingue el alta desde admisión del alta sin entrevista", async () => {
    const actorUserId = await createActorUserId();
    const admissionInterviewId = await insertFictitiousInterviewId();
    const [fromAdmission, manual] = await runInTransactionAs(
      actorUserId,
      (transaction) =>
        transaction
          .insert(guests)
          .values([
            buildFictitiousGuest({
              clinicalRecordNumber: 1,
              origin: "admission",
              admissionInterviewId,
            }),
            buildFictitiousGuest({ clinicalRecordNumber: 2 }),
          ])
          .returning({ id: guests.id }),
    );
    if (!fromAdmission || !manual) {
      throw new Error("No se crearon los huéspedes de prueba.");
    }

    const [admissionEntry] = await listGuestAuditEntries(fromAdmission.id);
    const [manualEntry] = await listGuestAuditEntries(manual.id);

    expect(admissionEntry).toMatchObject({
      action: "guest.created_from_admission",
      operation: "create",
      actor_user_id: actorUserId,
    });
    expect(admissionEntry?.new_value?.clinical_record_number).toBe(1);
    expect(manualEntry).toMatchObject({
      action: "guest.created_manually",
      operation: "create",
      actor_user_id: actorUserId,
    });
  });

  it("RN-20, R-02: registra edición y anulación con responsable y valores anterior y nuevo", async () => {
    const actorUserId = await createActorUserId();
    const [guest] = await insertGuest();
    if (!guest) {
      throw new Error("No se creó el huésped de prueba.");
    }

    await runInTransactionAs(actorUserId, async (transaction) => {
      const byId = eq(guests.id, guest.id);
      await transaction
        .update(guests)
        .set({ address: "Otra Calle Ficticia 456" })
        .where(byId);
      await transaction
        .update(guests)
        .set({
          annulledAt: new Date(),
          annulledByUserId: actorUserId,
          annulmentReason: "Carga duplicada de prueba",
        })
        .where(byId);
    });

    const [, updatedEntry, annulledEntry] = await listGuestAuditEntries(
      guest.id,
    );

    expect(updatedEntry).toMatchObject({
      action: "guest.updated",
      operation: "update",
      actor_user_id: actorUserId,
    });
    expect(updatedEntry?.previous_value?.address).toBe("Calle Ficticia 123");
    expect(updatedEntry?.new_value?.address).toBe("Otra Calle Ficticia 456");
    expect(annulledEntry).toMatchObject({
      action: "guest.annulled",
      operation: "delete",
      actor_user_id: actorUserId,
    });
    expect(annulledEntry?.new_value?.annulment_reason).toBe(
      "Carga duplicada de prueba",
    );
  });

  it("RN-20: registra los motivos de internación y síntomas agregados y quitados bajo el huésped", async () => {
    const actorUserId = await createActorUserId();
    const [guest] = await insertGuest();
    if (!guest) {
      throw new Error("No se creó el huésped de prueba.");
    }
    const hospitalizationReasonOptionId = await findSeededOptionId(
      "hospitalization_reason",
      "Desgaste del cuidador principal",
    );
    const uncontrolledSymptomOptionId = await findSeededOptionId(
      "uncontrolled_symptom",
      "Dolor",
    );

    await runInTransactionAs(actorUserId, async (transaction) => {
      await transaction
        .insert(guestHospitalizationReasons)
        .values({ guestId: guest.id, hospitalizationReasonOptionId });
      await transaction
        .insert(guestUncontrolledSymptoms)
        .values({ guestId: guest.id, uncontrolledSymptomOptionId });
      await transaction
        .delete(guestHospitalizationReasons)
        .where(eq(guestHospitalizationReasons.guestId, guest.id));
      await transaction
        .delete(guestUncontrolledSymptoms)
        .where(eq(guestUncontrolledSymptoms.guestId, guest.id));
    });

    const selectionActions = (await listGuestAuditEntries(guest.id))
      .filter((entry) => entry.resource !== "guest")
      .map(({ action, actor_user_id }) => ({ action, actor_user_id }));

    expect(selectionActions).toEqual([
      {
        action: "guest_hospitalization_reason.created",
        actor_user_id: actorUserId,
      },
      {
        action: "guest_uncontrolled_symptom.created",
        actor_user_id: actorUserId,
      },
      {
        action: "guest_hospitalization_reason.deleted",
        actor_user_id: actorUserId,
      },
      {
        action: "guest_uncontrolled_symptom.deleted",
        actor_user_id: actorUserId,
      },
    ]);
  });

  it("RF-ROL-08, R-18: declara los permisos de huéspedes, sus evaluaciones y sus evoluciones", () => {
    const guestsGroup = PERMISSION_GROUPS.find(
      (group) => group.key === "guests",
    );

    expect(
      guestsGroup?.permissions.map((permission) => permission.key),
    ).toEqual([
      "guests.records.view",
      "guests.records.create",
      "guests.records.manual_create",
      "guests.records.update",
      "guests.records.annul",
      "guests.cam_evaluations.view",
      "guests.cam_evaluations.create",
      "guests.cam_evaluations.update",
      "guests.physical_evaluations.view",
      "guests.physical_evaluations.create",
      "guests.physical_evaluations.update",
      "guests.daily_evolutions.view",
      "guests.daily_evolutions.create",
      "guests.daily_evolutions.update",
      "guests.daily_evolutions.annul",
    ]);
  });
});
