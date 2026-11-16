import { sql } from "drizzle-orm";

import { createFirstSuperUser } from "@/modules/access";
import type { CatalogKey } from "@/modules/catalogs";
import { getDatabase } from "@/platform/database/client";

import { admissionInterviews } from "./tables";

const FICTITIOUS_ACTOR = {
  name: "Ana Prueba",
  email: "ana.prueba@hospicare.test",
  password: "clave-de-prueba-larga",
};

type AdmissionInterviewInsert = typeof admissionInterviews.$inferInsert;

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
  catalog: CatalogKey,
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

export async function insertCatalogOption(
  catalog: CatalogKey,
  label: string,
): Promise<string> {
  const result = await getDatabase().execute<{ id: string }>(
    sql`insert into catalog_options (catalog, label, sort_order)
        values (${catalog}, ${label}, 1000)
        returning id`,
  );
  const [option] = result.rows;
  if (!option) {
    throw new Error(`No se creó la opción de prueba ${label}.`);
  }
  return option.id;
}

export async function buildFictitiousInterview(): Promise<AdmissionInterviewInsert> {
  return {
    interviewDate: "2026-11-10",
    guestFirstName: "Persona",
    guestLastName: "Ficticia",
    guestBirthDate: "1950-01-01",
    guestDni: "11222333",
    guestAddress: "Calle Ficticia 123",
    informationAwarenessOptionId: await findSeededOptionId(
      "information_awareness",
      "Total, conoce el diagnóstico y el pronóstico",
    ),
    religionOptionId: await findSeededOptionId("religion", "Ninguna"),
    ecogScoreOptionId: await findSeededOptionId(
      "ecog_score",
      "Asintomático, actividad normal",
    ),
    intervieweeFullName: "Familiar Ficticio",
    oncologicalTreatmentOptionId: await findSeededOptionId(
      "oncological_treatment",
      "No recibirá",
    ),
  };
}

export async function insertInterview(
  overrides: Partial<AdmissionInterviewInsert> = {},
) {
  return getDatabase()
    .insert(admissionInterviews)
    .values({ ...(await buildFictitiousInterview()), ...overrides })
    .returning({ id: admissionInterviews.id });
}

export async function insertHealthcareProfessional(
  fullName: string,
  isActive = true,
): Promise<string> {
  const result = await getDatabase().execute<{ id: string }>(
    sql`insert into healthcare_professionals (full_name, is_active)
        values (${fullName}, ${isActive})
        returning id`,
  );
  const [professional] = result.rows;
  if (!professional) {
    throw new Error(`No se creó el profesional de prueba ${fullName}.`);
  }
  return professional.id;
}

export async function deactivateCatalogOption(optionId: string): Promise<void> {
  await getDatabase().execute(
    sql`update catalog_options set is_active = false where id = ${optionId}`,
  );
}
