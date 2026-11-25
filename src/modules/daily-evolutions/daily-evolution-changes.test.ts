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
  addClarificationAction,
  annulDailyEvolutionAction,
  registerDailyEvolutionAction,
  updateDailyEvolutionAction,
} from "./actions";
import {
  addClarification,
  annulDailyEvolution,
  DAILY_EVOLUTION_REJECTION_MESSAGES,
  listDailyEvolutions,
  updateDailyEvolution,
} from "./service";

vi.mock("next/headers", async () => {
  const session = await import("@/testing/action-session");
  return { headers: async () => session.testRequestHeaders.current };
});
vi.mock("next/cache", () => ({ refresh: vi.fn() }));

const EVOLUTION_TEXT = "Pasó la noche tranquila, sin dolor.";
const CORRECTED_TEXT =
  "Pasó la noche tranquila, con dolor leve a la madrugada.";
const CLARIFICATION_TEXT = "El dolor cedió con la medicación de rescate.";
const ANNULMENT_REASON = "Cargada en el huésped equivocado";
const OTHER_USER_ID = "otra-persona-de-prueba";

async function insertFictitiousGuestId(): Promise<string> {
  const result = await getDatabase().execute<{ id: string }>(
    sql`insert into guests (
          clinical_record_number, hospitalization_date, first_name, last_name,
          birth_date, dni, address, origin
        ) values (
          1, '2026-11-12', 'Persona', 'Ficticia',
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

async function insertOtherUserWithUserRole(): Promise<void> {
  await getDatabase().execute(
    sql`insert into users (id, name, email)
        values (${OTHER_USER_ID}, 'Bruno Prueba', 'bruno.prueba@hospicare.test')`,
  );
  await getDatabase().execute(
    sql`insert into user_roles (user_id, role_id)
        select ${OTHER_USER_ID}, id from roles where system_key = 'user'`,
  );
}

async function registerEvolution(guestId: string) {
  await registerDailyEvolutionAction(guestId, { text: EVOLUTION_TEXT });
  const [evolution] = await listDailyEvolutions(guestId);
  if (!evolution) {
    throw new Error("No se registró la evolución de prueba.");
  }
  return evolution;
}

function moveWindowToThePast(evolutionId: string) {
  return getDatabase().execute(
    sql`update daily_evolutions
        set created_at = now() - interval '2 days',
            updated_at = now() - interval '2 days',
            editable_until = now() - interval '1 day'
        where id = ${evolutionId}`,
  );
}

async function listAuditEntries(resourceId: string) {
  const result = await getDatabase().execute<{
    action: string;
    operation: string;
    previous_text: string | null;
    new_text: string | null;
  }>(
    sql`select action, operation,
               previous_value->>'text' as previous_text,
               new_value->>'text' as new_text
        from audit_log where resource_id = ${resourceId} order by id`,
  );
  return result.rows;
}

describe("evolución diaria: editar, anular y notas aclaratorias", () => {
  beforeEach(async () => {
    await resetTestDatabase();
    vi.stubEnv("__NEXT_EXPERIMENTAL_AUTH_INTERRUPTS", "true");
  });

  it("RF-EVO-04, RN-08, R-02: el autor corrige el texto dentro de la ventana, la firma no cambia y queda el valor anterior", async () => {
    await signInAsSuperUser();
    const guestId = await insertFictitiousGuestId();
    const evolution = await registerEvolution(guestId);

    const result = await updateDailyEvolutionAction(
      evolution.id,
      evolution.version,
      { text: CORRECTED_TEXT },
    );

    expect(result).toEqual({ status: "success" });
    const [updated] = await listDailyEvolutions(guestId);
    expect(updated).toMatchObject({
      text: CORRECTED_TEXT,
      signature: evolution.signature,
    });
    expect(updated?.updatedAt.getTime()).toBeGreaterThan(
      evolution.registeredAt.getTime(),
    );
    const entries = await listAuditEntries(evolution.id);
    expect(entries.at(-1)).toEqual({
      action: "daily_evolution.updated",
      operation: "update",
      previous_text: EVOLUTION_TEXT,
      new_text: CORRECTED_TEXT,
    });
  });

  it("R-03, RF-EVO-04, RF-EVO-06: nadie más que el autor la corrige ni la anula", async () => {
    await signInAsSuperUser();
    await insertOtherUserWithUserRole();
    const guestId = await insertFictitiousGuestId();
    const evolution = await registerEvolution(guestId);

    const rejectedUpdate = await updateDailyEvolution(
      OTHER_USER_ID,
      evolution.id,
      evolution.version,
      CORRECTED_TEXT,
    );
    const rejectedAnnulment = await annulDailyEvolution(
      OTHER_USER_ID,
      evolution.id,
      ANNULMENT_REASON,
    );

    const notAuthor = {
      status: "rejected",
      message: DAILY_EVOLUTION_REJECTION_MESSAGES.notAuthor,
    };
    expect(rejectedUpdate).toEqual(notAuthor);
    expect(rejectedAnnulment).toEqual(notAuthor);
    await expect(listDailyEvolutions(guestId)).resolves.toMatchObject([
      { text: EVOLUTION_TEXT },
    ]);
  });

  it("CA-10, RF-EVO-05: fuera de la ventana rechaza editar y anular, y admite una nota aclaratoria", async () => {
    await signInAsSuperUser();
    const guestId = await insertFictitiousGuestId();
    const registered = await registerEvolution(guestId);
    await moveWindowToThePast(registered.id);
    const [evolution] = await listDailyEvolutions(guestId);
    if (!evolution) {
      throw new Error("Falta la evolución de prueba.");
    }

    const outOfWindow = {
      status: "rejected",
      message: DAILY_EVOLUTION_REJECTION_MESSAGES.outOfWindow,
    };
    await expect(
      updateDailyEvolutionAction(evolution.id, evolution.version, {
        text: CORRECTED_TEXT,
      }),
    ).resolves.toEqual(outOfWindow);
    await expect(
      annulDailyEvolutionAction(evolution.id, { reason: ANNULMENT_REASON }),
    ).resolves.toEqual(outOfWindow);
    await expect(
      addClarificationAction(evolution.id, { text: CLARIFICATION_TEXT }),
    ).resolves.toEqual({ status: "success" });
    await expect(listDailyEvolutions(guestId)).resolves.toMatchObject([
      {
        text: EVOLUTION_TEXT,
        clarifications: [{ text: CLARIFICATION_TEXT }],
      },
    ]);
  });

  it("RN-07: con bloqueo inmediato no se puede corregir después de registrarla", async () => {
    await signInAsSuperUser();
    const guestId = await insertFictitiousGuestId();
    await getDatabase().execute(
      sql`update system_settings set value = '{"mode": "immediate"}'::jsonb
          where key = 'daily_evolution_edit_window'`,
    );
    const evolution = await registerEvolution(guestId);

    await expect(
      updateDailyEvolutionAction(evolution.id, evolution.version, {
        text: CORRECTED_TEXT,
      }),
    ).resolves.toEqual({
      status: "rejected",
      message: DAILY_EVOLUTION_REJECTION_MESSAGES.outOfWindow,
    });
  });

  it("RF-EVO-06, RN-04, RN-22: el autor la anula con motivo, sale del historial y queda como baja", async () => {
    await signInAsSuperUser();
    const guestId = await insertFictitiousGuestId();
    const evolution = await registerEvolution(guestId);

    const result = await annulDailyEvolutionAction(evolution.id, {
      reason: ANNULMENT_REASON,
    });

    expect(result).toEqual({ status: "success" });
    await expect(listDailyEvolutions(guestId)).resolves.toEqual([]);
    const entries = await listAuditEntries(evolution.id);
    expect(entries.at(-1)).toMatchObject({
      action: "daily_evolution.annulled",
      operation: "delete",
    });
    const notAvailable = {
      status: "rejected",
      message: DAILY_EVOLUTION_REJECTION_MESSAGES.notAvailable,
    };
    await expect(
      updateDailyEvolutionAction(evolution.id, evolution.version, {
        text: CORRECTED_TEXT,
      }),
    ).resolves.toEqual(notAvailable);
    await expect(
      addClarificationAction(evolution.id, { text: CLARIFICATION_TEXT }),
    ).resolves.toEqual(notAvailable);
  });

  it("R-20: la anulación exige un motivo de al menos 10 caracteres", async () => {
    await signInAsSuperUser();
    const guestId = await insertFictitiousGuestId();
    const evolution = await registerEvolution(guestId);

    await expect(
      annulDailyEvolutionAction(evolution.id, { reason: "Error" }),
    ).resolves.toEqual({
      status: "invalid",
      fieldErrors: { reason: ["El motivo debe tener al menos 10 caracteres."] },
    });
    await expect(listDailyEvolutions(guestId)).resolves.toHaveLength(1);
  });

  it("RF-EVO-04: rechaza los cambios si la evolución cambió mientras tanto", async () => {
    await signInAsSuperUser();
    const guestId = await insertFictitiousGuestId();
    const evolution = await registerEvolution(guestId);
    await updateDailyEvolutionAction(evolution.id, evolution.version, {
      text: CORRECTED_TEXT,
    });

    await expect(
      updateDailyEvolutionAction(evolution.id, evolution.version, {
        text: EVOLUTION_TEXT,
      }),
    ).resolves.toEqual({
      status: "rejected",
      message: DAILY_EVOLUTION_REJECTION_MESSAGES.changedMeanwhile,
    });
  });

  it("RF-EVO-05, RN-20: otra persona agrega notas firmadas con su criterio, en orden de carga", async () => {
    await signInAsSuperUser();
    await insertOtherUserWithUserRole();
    const guestId = await insertFictitiousGuestId();
    const evolution = await registerEvolution(guestId);

    await addClarification(OTHER_USER_ID, evolution.id, CLARIFICATION_TEXT);
    await addClarificationAction(evolution.id, {
      text: "Se avisó a la familia por teléfono.",
    });

    const [withClarifications] = await listDailyEvolutions(guestId);
    expect(withClarifications?.clarifications).toMatchObject([
      {
        text: CLARIFICATION_TEXT,
        signature: "Usuario",
        authorName: "Bruno Prueba",
      },
      { text: "Se avisó a la familia por teléfono.", signature: "Super user" },
    ]);
    const auditEntries = await getDatabase().execute<{ total: number }>(
      sql`select count(*)::int as total from audit_log
          where action = 'daily_evolution_clarification.created'`,
    );
    expect(auditEntries.rows[0]?.total).toBe(2);
  });

  it("RF-EVO-05: la base no deja modificar una nota aclaratoria", async () => {
    await signInAsSuperUser();
    const guestId = await insertFictitiousGuestId();
    const evolution = await registerEvolution(guestId);
    await addClarificationAction(evolution.id, { text: CLARIFICATION_TEXT });

    await expect(
      getDatabase().execute(
        sql`update daily_evolution_clarifications set text = 'Texto cambiado a mano'`,
      ),
    ).rejects.toMatchObject({ cause: { code: "42501" } });
  });

  it("RF-HUE-06: con el huésped anulado no se corrige ni se agregan notas", async () => {
    const actorUserId = await signInAsSuperUser();
    const guestId = await insertFictitiousGuestId();
    const evolution = await registerEvolution(guestId);
    await getDatabase().execute(
      sql`update guests set annulled_at = now(), annulled_by_user_id = ${actorUserId},
                 annulment_reason = 'Carga duplicada por error'
          where id = ${guestId}`,
    );

    const annulled = {
      status: "rejected",
      message: GUEST_REJECTION_MESSAGES.annulled,
    };
    await expect(
      updateDailyEvolutionAction(evolution.id, evolution.version, {
        text: CORRECTED_TEXT,
      }),
    ).resolves.toEqual(annulled);
    await expect(
      addClarificationAction(evolution.id, { text: CLARIFICATION_TEXT }),
    ).resolves.toEqual(annulled);
  });

  it("RF-ROL-08, RN-14: sin permiso de modificar ni de anular el servidor rechaza", async () => {
    await signInAsSuperUser();
    const guestId = await insertFictitiousGuestId();
    const evolution = await registerEvolution(guestId);
    await restrictSignedInUserTo([
      "guests.records.view",
      "guests.daily_evolutions.view",
      "guests.daily_evolutions.create",
    ]);

    await expect(
      updateDailyEvolutionAction(evolution.id, evolution.version, {
        text: CORRECTED_TEXT,
      }),
    ).rejects.toMatchObject({ digest: FORBIDDEN_DIGEST });
    await expect(
      annulDailyEvolutionAction(evolution.id, { reason: ANNULMENT_REASON }),
    ).rejects.toMatchObject({ digest: FORBIDDEN_DIGEST });
  });
});
