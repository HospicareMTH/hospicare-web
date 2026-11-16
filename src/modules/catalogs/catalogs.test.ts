// @vitest-environment node

import { asc, eq, sql } from "drizzle-orm";
import { beforeEach, describe, expect, it } from "vitest";

import { createFirstSuperUser, PERMISSION_GROUPS } from "@/modules/access";
import { getDatabase, runInTransactionAs } from "@/platform/database/client";
import { resetTestDatabase } from "@/platform/database/test-database";

import { catalogOptions } from "./tables";

const SEEDED_OPTION_COUNT = 123;
const CATALOG_PERMISSION_GROUPS = [
  "relationship_types",
  "healthcare_professionals",
  "health_insurance_providers",
  "information_awareness_options",
  "religion_options",
  "ecog_score_options",
  "oncological_treatment_options",
  "metastasis_location_options",
  "surgery_options",
  "guest_clinical_catalog_options",
];
const CATALOG_PERMISSION_ACTIONS = ["view", "create", "update", "delete"];
const UNIQUE_VIOLATION = { cause: { code: "23505" } };
const PERMISSION_DENIED = { cause: { code: "42501" } };
const FICTITIOUS_ACTOR = {
  name: "Ana Prueba",
  email: "ana.prueba@hospicare.test",
  password: "clave-de-prueba-larga",
};

type AuditEntry = {
  action: string;
  operation: string;
  actor_user_id: string | null;
  previous_value: Record<string, unknown> | null;
  new_value: Record<string, unknown> | null;
};

async function createActorUserId(): Promise<string> {
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

async function listCatalogAuditEntries(
  optionId: string,
): Promise<AuditEntry[]> {
  const result = await getDatabase().execute<AuditEntry>(
    sql`select action, operation, actor_user_id, previous_value, new_value
        from audit_log
        where resource = 'catalog_option' and resource_id = ${optionId}
        order by id`,
  );
  return result.rows;
}

async function insertOption(
  catalog: (typeof catalogOptions.$inferInsert)["catalog"],
  label: string,
) {
  const [option] = await getDatabase()
    .insert(catalogOptions)
    .values({ catalog, label, sortOrder: 1000 })
    .returning();
  return option;
}

describe("catálogos: base", () => {
  beforeEach(async () => {
    await resetTestDatabase();
  });

  it("siembra las 123 opciones base, activas y marcadas como de sistema", async () => {
    const options = await getDatabase().select().from(catalogOptions);

    expect(options).toHaveLength(SEEDED_OPTION_COUNT);
    expect(options.every((option) => option.isActive && option.isSystem)).toBe(
      true,
    );
  });

  it("siembra Vínculos en el orden de la ERS y deja vacíos Cirugías y Lugares de metástasis", async () => {
    const database = getDatabase();
    const relationships = await database
      .select({ label: catalogOptions.label })
      .from(catalogOptions)
      .where(eq(catalogOptions.catalog, "relationship"))
      .orderBy(asc(catalogOptions.sortOrder));
    const emptyCatalogOptions = await database
      .select()
      .from(catalogOptions)
      .where(
        sql`${catalogOptions.catalog} in ('surgery', 'metastasis_location')`,
      );

    expect(relationships.map((option) => option.label)).toEqual([
      "Hija/o",
      "Cónyuge",
      "Hermana/o",
      "Madre",
      "Padre",
      "Nieto/a",
      "Cuidador/a",
      "Otro",
    ]);
    expect(emptyCatalogOptions).toEqual([]);
  });

  it("RF-CAT-06: rechaza una etiqueta repetida sin distinguir mayúsculas ni acentos", async () => {
    await expect(
      insertOption("health_insurance", "osde"),
    ).rejects.toMatchObject(UNIQUE_VIOLATION);
    await expect(insertOption("religion", " Catolico ")).rejects.toMatchObject(
      UNIQUE_VIOLATION,
    );
  });

  it("RF-CAT-06: admite la misma etiqueta en otro catálogo y distingue la ñ", async () => {
    await expect(insertOption("surgery", "Otro")).resolves.toBeDefined();
    await expect(insertOption("surgery", "Año")).resolves.toBeDefined();
    await expect(insertOption("surgery", "Ano")).resolves.toBeDefined();
  });

  it("RN-04, RNF-10: la aplicación no puede borrar opciones físicamente", async () => {
    await expect(
      getDatabase().execute(sql`delete from catalog_options`),
    ).rejects.toMatchObject(PERMISSION_DENIED);
  });

  it("RN-20: registra alta, edición, orden, desactivación y reactivación con valores anterior y nuevo", async () => {
    const actorUserId = await createActorUserId();
    const optionId = await runInTransactionAs(
      actorUserId,
      async (transaction) => {
        const [option] = await transaction
          .insert(catalogOptions)
          .values({ catalog: "surgery", label: "Colectomía", sortOrder: 10 })
          .returning({ id: catalogOptions.id });
        if (!option) {
          throw new Error("No se creó la opción de prueba.");
        }
        const byId = eq(catalogOptions.id, option.id);
        await transaction
          .update(catalogOptions)
          .set({ label: "Colectomía parcial" })
          .where(byId);
        await transaction
          .update(catalogOptions)
          .set({ sortOrder: 20 })
          .where(byId);
        await transaction
          .update(catalogOptions)
          .set({ isActive: false })
          .where(byId);
        await transaction
          .update(catalogOptions)
          .set({ isActive: true })
          .where(byId);
        return option.id;
      },
    );

    const entries = await listCatalogAuditEntries(optionId);

    expect(
      entries.map(({ action, operation }) => ({ action, operation })),
    ).toEqual([
      { action: "catalog_option.created", operation: "create" },
      { action: "catalog_option.updated", operation: "update" },
      { action: "catalog_option.reordered", operation: "update" },
      { action: "catalog_option.deactivated", operation: "delete" },
      { action: "catalog_option.reactivated", operation: "update" },
    ]);
    expect(entries.every((entry) => entry.actor_user_id === actorUserId)).toBe(
      true,
    );
    expect(entries[1]?.previous_value?.label).toBe("Colectomía");
    expect(entries[1]?.new_value?.label).toBe("Colectomía parcial");
    expect(entries[2]?.previous_value?.sort_order).toBe(10);
    expect(entries[2]?.new_value?.sort_order).toBe(20);
  });

  it("RF-CAT-01: declara ver, crear, modificar y desactivar en cada uno de los 10 catálogos", () => {
    const declaredPermissionKeys = new Set<string>(
      PERMISSION_GROUPS.flatMap((group) =>
        group.permissions.map((permission) => permission.key),
      ),
    );

    for (const group of CATALOG_PERMISSION_GROUPS) {
      for (const action of CATALOG_PERMISSION_ACTIONS) {
        expect(declaredPermissionKeys).toContain(`admin.${group}.${action}`);
      }
    }
  });
});
