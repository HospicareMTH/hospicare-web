import { sql } from "drizzle-orm";

import { createFirstSuperUser } from "@/modules/access";
import { getDatabase } from "@/platform/database/client";

import { guests } from "./tables";

const FICTITIOUS_ACTOR = {
  name: "Ana Prueba",
  email: "ana.prueba@hospicare.test",
  password: "clave-de-prueba-larga",
};

type GuestInsert = typeof guests.$inferInsert;

export async function createActorUserId(): Promise<string> {
  await createFirstSuperUser(FICTITIOUS_ACTOR);
  const result = await getDatabase().execute<{ id: string }>(
    sql`select id from users where email = ${FICTITIOUS_ACTOR.email}`,
  );
  const [actor] = result.rows;
  if (!actor) {
    throw new Error("No se creó el usuario de prueba.");
  }
  return actor.id;
}

export async function findSeededOptionId(
  catalog: string,
  label: string,
): Promise<string> {
  const result = await getDatabase().execute<{ id: string }>(
    sql`select id from catalog_options where catalog = ${catalog} and label = ${label}`,
  );
  const [option] = result.rows;
  if (!option) {
    throw new Error(`No existe la opción sembrada ${label}.`);
  }
  return option.id;
}

export async function insertFictitiousInterviewId(): Promise<string> {
  const result = await getDatabase().execute<{ id: string }>(
    sql`insert into admission_interviews (
          interview_date, guest_first_name, guest_last_name, guest_birth_date,
          guest_dni, guest_address, information_awareness_option_id,
          religion_option_id, ecog_score_option_id, interviewee_full_name,
          oncological_treatment_option_id
        ) values (
          '2026-11-10', 'Persona', 'Ficticia', '1950-01-01', '11222333',
          'Calle Ficticia 123',
          ${await findSeededOptionId("information_awareness", "Total, conoce el diagnóstico y el pronóstico")},
          ${await findSeededOptionId("religion", "Ninguna")},
          ${await findSeededOptionId("ecog_score", "Asintomático, actividad normal")},
          'Familiar Ficticio',
          ${await findSeededOptionId("oncological_treatment", "No recibirá")}
        )
        returning id`,
  );
  const [interview] = result.rows;
  if (!interview) {
    throw new Error("No se creó la entrevista de prueba.");
  }
  return interview.id;
}

export function buildFictitiousGuest(
  overrides: Partial<GuestInsert> = {},
): GuestInsert {
  return {
    clinicalRecordNumber: 1,
    hospitalizationDate: "2026-11-12",
    firstName: "Persona",
    lastName: "Ficticia",
    birthDate: "1950-01-01",
    dni: "11222333",
    address: "Calle Ficticia 123",
    origin: "manual",
    ...overrides,
  };
}

export function insertGuest(overrides: Partial<GuestInsert> = {}) {
  return getDatabase()
    .insert(guests)
    .values(buildFictitiousGuest(overrides))
    .returning({ id: guests.id });
}
