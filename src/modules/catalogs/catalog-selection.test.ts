// @vitest-environment node

import { and, eq } from "drizzle-orm";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { getDatabase, runInTransaction } from "@/platform/database/client";
import { resetTestDatabase } from "@/platform/database/test-database";

import { signInAsSuperUser, testRequestHeaders } from "./catalog-test-session";
import type { CatalogKey } from "./definitions";
import {
  createHealthcareProfessional,
  listSelectableHealthcareProfessionals,
  setHealthcareProfessionalActive,
  validateHealthcareProfessionalSelection,
} from "./professionals/service";
import {
  createCatalogOption,
  listSelectableCatalogOptions,
  setCatalogOptionActive,
  validateCatalogSelection,
} from "./service";
import { catalogOptions } from "./tables";

vi.mock("next/headers", () => ({
  headers: async () => testRequestHeaders.current,
}));
vi.mock("next/cache", () => ({ refresh: vi.fn() }));

const OPTION_MISSING = "La opción ya no existe. Actualizá la pantalla.";
const PROFESSIONAL_MISSING =
  "El profesional ya no existe. Actualizá la pantalla.";

async function findOptionId(catalog: CatalogKey, label: string) {
  const [option] = await getDatabase()
    .select({ id: catalogOptions.id })
    .from(catalogOptions)
    .where(
      and(eq(catalogOptions.catalog, catalog), eq(catalogOptions.label, label)),
    );
  if (!option) {
    throw new Error(`No existe la opción de prueba ${label}.`);
  }
  return option.id;
}

function validateReligion(selectedIds: string[], savedIds: string[] = []) {
  return runInTransaction((transaction) =>
    validateCatalogSelection(transaction, "religion", selectedIds, savedIds),
  );
}

describe("catálogos: uso desde formularios", () => {
  let actorUserId: string;
  let mormonId: string;

  beforeEach(async () => {
    await resetTestDatabase();
    actorUserId = await signInAsSuperUser();
    mormonId = await findOptionId("religion", "Mormón");
    await setCatalogOptionActive(actorUserId, mormonId, false);
  });

  it("RF-CAT-03, RF-CAT-02: ofrece las activas en orden y suma la inactiva ya guardada", async () => {
    const newRecordOptions = await listSelectableCatalogOptions("religion");
    const savedRecordOptions = await listSelectableCatalogOptions("religion", [
      mormonId,
    ]);

    expect(newRecordOptions.map((option) => option.label)).toEqual([
      "Ninguna",
      "Católico",
      "Judío",
      "Evangelista",
      "Testigo de Jehová",
      "Otra",
    ]);
    expect(savedRecordOptions).toContainEqual({
      id: mormonId,
      label: "Mormón",
      isActive: false,
    });
  });

  it("RF-CAT-07: rechaza una opción inactiva nueva y acepta la que ya estaba guardada", async () => {
    await expect(validateReligion([mormonId])).resolves.toEqual({
      status: "rejected",
      message: "La opción «Mormón» ya no está disponible. Elegí otra.",
    });
    await expect(validateReligion([mormonId], [mormonId])).resolves.toEqual({
      status: "success",
    });
    await expect(
      validateReligion([await findOptionId("religion", "Judío")]),
    ).resolves.toEqual({ status: "success" });
  });

  it("RF-CAT-07: rechaza opciones de otro catálogo o con un identificador inválido", async () => {
    const osdeId = await findOptionId("health_insurance", "OSDE");

    await expect(validateReligion([osdeId])).resolves.toEqual({
      status: "rejected",
      message: OPTION_MISSING,
    });
    await expect(validateReligion(["no-es-un-id"])).resolves.toEqual({
      status: "rejected",
      message: OPTION_MISSING,
    });
    await expect(validateReligion([])).resolves.toEqual({ status: "success" });
  });

  it("RF-CAT-04: el alta devuelve el identificador para dejar la opción elegida", async () => {
    const result = await createCatalogOption(actorUserId, "religion", {
      label: "Budista",
      description: null,
    });
    const reactivation = await createCatalogOption(actorUserId, "religion", {
      label: "mormon",
      description: null,
    });

    expect(result).toEqual({
      status: "success",
      wasReactivated: false,
      optionId: await findOptionId("religion", "Budista"),
    });
    expect(reactivation).toEqual({
      status: "success",
      wasReactivated: true,
      optionId: mormonId,
    });
  });

  it("RF-CAT-07, RF-CAT-02: valida y ofrece profesionales con la misma regla", async () => {
    const created = await createHealthcareProfessional(actorUserId, {
      fullName: "Laura Ficticia",
      specialty: null,
      licenseNumber: null,
      phone: null,
      email: null,
    });
    if (created.status !== "success") {
      throw new Error("No se creó el profesional de prueba.");
    }
    const { professionalId } = created;
    await setHealthcareProfessionalActive(actorUserId, professionalId, false);

    await expect(listSelectableHealthcareProfessionals()).resolves.toEqual([]);
    await expect(
      listSelectableHealthcareProfessionals([professionalId]),
    ).resolves.toEqual([
      { id: professionalId, label: "Laura Ficticia", isActive: false },
    ]);
    await expect(
      runInTransaction((transaction) =>
        validateHealthcareProfessionalSelection(
          transaction,
          [professionalId],
          [],
        ),
      ),
    ).resolves.toEqual({
      status: "rejected",
      message: "La opción «Laura Ficticia» ya no está disponible. Elegí otra.",
    });
    await expect(
      runInTransaction((transaction) =>
        validateHealthcareProfessionalSelection(transaction, ["x"], []),
      ),
    ).resolves.toEqual({ status: "rejected", message: PROFESSIONAL_MISSING });
  });
});
