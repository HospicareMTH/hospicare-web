// @vitest-environment node

import { sql } from "drizzle-orm";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { GUEST_REJECTION_MESSAGES } from "@/modules/guests";
import { getDatabase } from "@/platform/database/client";
import { resetTestDatabase } from "@/platform/database/test-database";
import {
  FICTITIOUS_SUPER_USER,
  FORBIDDEN_DIGEST,
  restrictSignedInUserTo,
  signInAsSuperUser,
} from "@/testing/action-session";

import { registerDailyEvolutionAction } from "./actions";
import { listDailyEvolutions, resolveSignature } from "./service";
import { dailyEvolutions } from "./tables";

vi.mock("next/headers", async () => {
  const session = await import("@/testing/action-session");
  return { headers: async () => session.testRequestHeaders.current };
});
vi.mock("next/cache", () => ({ refresh: vi.fn() }));

const EVOLUTION_TEXT = "Pasó la noche tranquila, sin dolor.";
const HOUR_IN_MILLISECONDS = 3_600_000;
const SUPER_USER_ROLE_NAME = "Super user";

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

function insertProfessional(specialty: string | null) {
  return getDatabase().execute(
    sql`insert into healthcare_professionals (full_name, specialty, email, is_active)
        values ('Ana Prueba', ${specialty}, ${FICTITIOUS_SUPER_USER.email}, true)`,
  );
}

function setEditWindow(value: string) {
  return getDatabase().execute(
    sql`update system_settings set value = ${value}::jsonb
        where key = 'daily_evolution_edit_window'`,
  );
}

async function findStoredEvolution(guestId: string) {
  const [evolution] = await getDatabase()
    .select()
    .from(dailyEvolutions)
    .where(sql`${dailyEvolutions.guestId} = ${guestId}`);
  if (!evolution) {
    throw new Error("No se encontró la evolución de prueba.");
  }
  return evolution;
}

describe("evolución diaria: registrar y consultar", () => {
  beforeEach(async () => {
    await resetTestDatabase();
    vi.stubEnv("__NEXT_EXPERIMENTAL_AUTH_INTERRUPTS", "true");
  });

  it("RF-EVO-02, RN-20: registra la evolución con su autor y lo anota en el registro de actividad", async () => {
    const actorUserId = await signInAsSuperUser();
    const guestId = await insertFictitiousGuestId();

    const result = await registerDailyEvolutionAction(guestId, {
      text: `  ${EVOLUTION_TEXT}  `,
    });

    expect(result).toEqual({ status: "success" });
    await expect(listDailyEvolutions(guestId)).resolves.toMatchObject([
      {
        text: EVOLUTION_TEXT,
        authorName: "Ana Prueba",
        signature: SUPER_USER_ROLE_NAME,
      },
    ]);
    const auditEntries = await getDatabase().execute<{
      action: string;
      actor_user_id: string;
    }>(
      sql`select action, actor_user_id from audit_log where resource = 'daily_evolution'`,
    );
    expect(auditEntries.rows).toEqual([
      { action: "daily_evolution.created", actor_user_id: actorUserId },
    ]);
  });

  it("RF-EVO-03: firma con la especialidad del profesional activo con el mismo correo", async () => {
    const actorUserId = await signInAsSuperUser();
    await insertProfessional("Enfermería");

    await expect(resolveSignature(actorUserId)).resolves.toBe("Enfermería");
  });

  it("CA-09, RF-EVO-03: sin especialidad o con el profesional inactivo, firma con el nombre del rol", async () => {
    const actorUserId = await signInAsSuperUser();
    await insertProfessional(null);
    await expect(resolveSignature(actorUserId)).resolves.toBe(
      SUPER_USER_ROLE_NAME,
    );

    await getDatabase().execute(
      sql`update healthcare_professionals set specialty = 'Psicología', is_active = false`,
    );
    await expect(resolveSignature(actorUserId)).resolves.toBe(
      SUPER_USER_ROLE_NAME,
    );
  });

  it("RN-08: la firma guardada no cambia si después cambia la especialidad", async () => {
    await signInAsSuperUser();
    const guestId = await insertFictitiousGuestId();
    await insertProfessional("Medicina paliativa");
    await registerDailyEvolutionAction(guestId, { text: EVOLUTION_TEXT });

    await getDatabase().execute(
      sql`update healthcare_professionals set specialty = 'Clínica médica'`,
    );

    await expect(listDailyEvolutions(guestId)).resolves.toMatchObject([
      { signature: "Medicina paliativa" },
    ]);
  });

  it("RF-EVO-02, RF-CFG-03: fija el límite con la ventana vigente al registrar", async () => {
    await signInAsSuperUser();
    const guestId = await insertFictitiousGuestId();
    await setEditWindow('{"mode": "duration", "amount": 2, "unit": "hours"}');

    await registerDailyEvolutionAction(guestId, { text: EVOLUTION_TEXT });
    await setEditWindow('{"mode": "immediate"}');

    const evolution = await findStoredEvolution(guestId);
    expect(
      evolution.editableUntil.getTime() - evolution.createdAt.getTime(),
    ).toBe(2 * HOUR_IN_MILLISECONDS);
  });

  it("RN-07: con bloqueo inmediato el límite es el mismo momento del registro", async () => {
    await signInAsSuperUser();
    const guestId = await insertFictitiousGuestId();
    await setEditWindow('{"mode": "immediate"}');

    await registerDailyEvolutionAction(guestId, { text: EVOLUTION_TEXT });

    const evolution = await findStoredEvolution(guestId);
    expect(evolution.editableUntil).toEqual(evolution.createdAt);
  });

  it("RF-EVO-01: lista de la más reciente a la más antigua, solo las del huésped", async () => {
    await signInAsSuperUser();
    const guestId = await insertFictitiousGuestId();
    const otherGuestId = await insertFictitiousGuestId(2);
    await registerDailyEvolutionAction(guestId, { text: "Primera evolución." });
    await registerDailyEvolutionAction(otherGuestId, {
      text: "Evolución de otro huésped.",
    });
    await registerDailyEvolutionAction(guestId, { text: "Segunda evolución." });

    const evolutions = await listDailyEvolutions(guestId);

    expect(evolutions.map(({ text }) => text)).toEqual([
      "Segunda evolución.",
      "Primera evolución.",
    ]);
  });

  it("RF-EVO-07: rechaza un texto corto junto al campo, sin registrar", async () => {
    await signInAsSuperUser();
    const guestId = await insertFictitiousGuestId();

    const result = await registerDailyEvolutionAction(guestId, {
      text: "Corta",
    });

    expect(result).toEqual({
      status: "invalid",
      fieldErrors: {
        text: ["La evolución debe tener al menos 10 caracteres."],
      },
    });
    await expect(listDailyEvolutions(guestId)).resolves.toEqual([]);
  });

  it("RF-HUE-06: con el huésped anulado no se registra", async () => {
    const actorUserId = await signInAsSuperUser();
    const guestId = await insertFictitiousGuestId();
    await getDatabase().execute(
      sql`update guests set annulled_at = now(), annulled_by_user_id = ${actorUserId},
                 annulment_reason = 'Carga duplicada por error'
          where id = ${guestId}`,
    );

    await expect(
      registerDailyEvolutionAction(guestId, { text: EVOLUTION_TEXT }),
    ).resolves.toEqual({
      status: "rejected",
      message: GUEST_REJECTION_MESSAGES.annulled,
    });
  });

  it("RF-ROL-08, RN-14: sin permiso de crear evoluciones el servidor rechaza", async () => {
    await signInAsSuperUser();
    const guestId = await insertFictitiousGuestId();
    await restrictSignedInUserTo([
      "guests.records.view",
      "guests.daily_evolutions.view",
    ]);

    await expect(
      registerDailyEvolutionAction(guestId, { text: EVOLUTION_TEXT }),
    ).rejects.toMatchObject({ digest: FORBIDDEN_DIGEST });
    await expect(listDailyEvolutions(guestId)).resolves.toEqual([]);
  });
});
