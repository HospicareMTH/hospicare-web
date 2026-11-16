// @vitest-environment node

import { and, asc, eq, sql } from "drizzle-orm";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { getDatabase } from "@/platform/database/client";
import { resetTestDatabase } from "@/platform/database/test-database";

import {
  createCatalogOptionAction,
  deactivateCatalogOptionAction,
  moveCatalogOptionAction,
  reactivateCatalogOptionAction,
  updateCatalogOptionAction,
} from "./actions";
import {
  FORBIDDEN_DIGEST,
  restrictSignedInUserTo,
  signInAsSuperUser,
} from "./catalog-test-session";
import type { CatalogKey } from "./definitions";
import { catalogOptions } from "./tables";

vi.mock("next/headers", async () => {
  const session = await import("./catalog-test-session");
  return { headers: async () => session.testRequestHeaders.current };
});
vi.mock("next/cache", () => ({ refresh: vi.fn() }));

async function findOption(catalog: CatalogKey, label: string) {
  const [option] = await getDatabase()
    .select()
    .from(catalogOptions)
    .where(
      and(eq(catalogOptions.catalog, catalog), eq(catalogOptions.label, label)),
    );
  if (!option) {
    throw new Error(`No existe la opción de prueba ${label}.`);
  }
  return option;
}

async function listActiveLabels(catalog: CatalogKey): Promise<string[]> {
  const options = await getDatabase()
    .select({ label: catalogOptions.label })
    .from(catalogOptions)
    .where(
      and(
        eq(catalogOptions.catalog, catalog),
        eq(catalogOptions.isActive, true),
      ),
    )
    .orderBy(asc(catalogOptions.sortOrder));
  return options.map((option) => option.label);
}

async function countOptions(catalog: CatalogKey): Promise<number> {
  return (
    await getDatabase()
      .select()
      .from(catalogOptions)
      .where(eq(catalogOptions.catalog, catalog))
  ).length;
}

describe("catálogos: cambios de opciones", () => {
  let superUserId: string;

  beforeEach(async () => {
    vi.stubEnv("__NEXT_EXPERIMENTAL_AUTH_INTERRUPTS", "true");
    await resetTestDatabase();
    superUserId = await signInAsSuperUser();
  });

  it("RF-CAT-01, RN-20: crea la opción al final del catálogo con su responsable", async () => {
    await expect(
      createCatalogOptionAction("religion", {
        label: "  Budista ",
        description: "",
      }),
    ).resolves.toMatchObject({ status: "success", wasReactivated: false });

    const option = await findOption("religion", "Budista");
    expect(option).toMatchObject({
      description: null,
      isActive: true,
      isSystem: false,
      sortOrder: 80,
      createdByUserId: superUserId,
    });
    const audit = await getDatabase().execute<{ actor_user_id: string }>(
      sql`select actor_user_id from audit_log where action = 'catalog_option.created' and resource_id = ${option.id}`,
    );
    expect(audit.rows).toEqual([{ actor_user_id: superUserId }]);
  });

  it("RF-CAT-01: rechaza nombres de menos de 2 o más de 120 caracteres", async () => {
    await expect(
      createCatalogOptionAction("religion", { label: "B", description: "" }),
    ).resolves.toMatchObject({ status: "invalid" });
    await expect(
      createCatalogOptionAction("religion", {
        label: "B".repeat(121),
        description: "",
      }),
    ).resolves.toMatchObject({ status: "invalid" });
    expect(await countOptions("religion")).toBe(7);
  });

  it("RF-CAT-06: rechaza un nombre activo repetido al crear y al editar", async () => {
    const galeno = await findOption("health_insurance", "Galeno");

    await expect(
      createCatalogOptionAction("health_insurance", {
        label: "osde",
        description: "",
      }),
    ).resolves.toEqual({
      status: "invalid",
      fieldErrors: { label: ["Ya existe «osde» en este catálogo."] },
    });
    await expect(
      updateCatalogOptionAction(galeno.id, { label: "OSDE", description: "" }),
    ).resolves.toEqual({
      status: "invalid",
      fieldErrors: { label: ["Ya existe «OSDE» en este catálogo."] },
    });
    expect((await findOption("health_insurance", "Galeno")).label).toBe(
      "Galeno",
    );
  });

  it("RF-CAT-02, RF-CAT-06: desactivar conserva la opción y crearla de nuevo la reactiva", async () => {
    const judio = await findOption("religion", "Judío");

    await expect(deactivateCatalogOptionAction(judio.id)).resolves.toEqual({
      status: "success",
    });
    expect((await findOption("religion", "Judío")).isActive).toBe(false);

    await expect(
      createCatalogOptionAction("religion", {
        label: "judio",
        description: "",
      }),
    ).resolves.toMatchObject({ status: "success", wasReactivated: true });

    const reactivated = await findOption("religion", "Judío");
    expect(reactivated.isActive).toBe(true);
    expect(reactivated.sortOrder).toBe(judio.sortOrder);
    expect(await countOptions("religion")).toBe(7);
  });

  it("RF-CAT-01: edita nombre y descripción, y reactiva desde la fila", async () => {
    const otra = await findOption("religion", "Otra");

    await expect(
      updateCatalogOptionAction(otra.id, {
        label: "Otra religión",
        description: "Declarada por la familia.",
      }),
    ).resolves.toEqual({ status: "success" });
    await deactivateCatalogOptionAction(otra.id);
    await expect(reactivateCatalogOptionAction(otra.id)).resolves.toEqual({
      status: "success",
    });

    expect(await findOption("religion", "Otra religión")).toMatchObject({
      description: "Declarada por la familia.",
      isActive: true,
      updatedByUserId: superUserId,
    });
  });

  it("CA-03, RF-ROL-08: sin permiso del catálogo el servidor rechaza sin cambiar datos", async () => {
    await restrictSignedInUserTo([
      "admin.religion_options.view",
      "admin.religion_options.create",
    ]);
    const osde = await findOption("health_insurance", "OSDE");
    const catolico = await findOption("religion", "Católico");

    await expect(
      createCatalogOptionAction("health_insurance", {
        label: "Nueva cobertura",
        description: "",
      }),
    ).rejects.toMatchObject({ digest: FORBIDDEN_DIGEST });
    await expect(deactivateCatalogOptionAction(osde.id)).rejects.toMatchObject({
      digest: FORBIDDEN_DIGEST,
    });
    await expect(
      updateCatalogOptionAction(catolico.id, {
        label: "Católica",
        description: "",
      }),
    ).rejects.toMatchObject({ digest: FORBIDDEN_DIGEST });
    await expect(
      deactivateCatalogOptionAction(catolico.id),
    ).rejects.toMatchObject({ digest: FORBIDDEN_DIGEST });

    expect(await countOptions("health_insurance")).toBe(18);
    expect((await findOption("health_insurance", "OSDE")).isActive).toBe(true);
    expect((await findOption("religion", "Católico")).isActive).toBe(true);
  });

  it("RF-CAT-06: con permiso de crear alcanza para reactivar por nombre repetido", async () => {
    await deactivateCatalogOptionAction(
      (await findOption("religion", "Mormón")).id,
    );
    await restrictSignedInUserTo([
      "admin.religion_options.view",
      "admin.religion_options.create",
    ]);

    await expect(
      createCatalogOptionAction("religion", {
        label: "Mormon",
        description: "",
      }),
    ).resolves.toMatchObject({ status: "success", wasReactivated: true });
  });

  it("RF-CAT-03, RN-20: subir y bajar intercambia con la opción activa vecina y audita el orden", async () => {
    const judio = await findOption("religion", "Judío");

    await expect(
      moveCatalogOptionAction(judio.id, { direction: "up" }),
    ).resolves.toEqual({ status: "success" });
    expect(await listActiveLabels("religion")).toEqual([
      "Ninguna",
      "Judío",
      "Católico",
      "Evangelista",
      "Mormón",
      "Testigo de Jehová",
      "Otra",
    ]);

    await expect(
      moveCatalogOptionAction(judio.id, { direction: "down" }),
    ).resolves.toEqual({ status: "success" });
    expect((await listActiveLabels("religion")).slice(0, 3)).toEqual([
      "Ninguna",
      "Católico",
      "Judío",
    ]);

    const audit = await getDatabase().execute<{ actor_user_id: string }>(
      sql`select actor_user_id from audit_log where action = 'catalog_option.reordered' and resource_id = ${judio.id}`,
    );
    expect(audit.rows).toEqual([
      { actor_user_id: superUserId },
      { actor_user_id: superUserId },
    ]);
  });

  it("RF-CAT-03: arrastrar ubica la opción en el lugar de la opción de destino", async () => {
    const otra = await findOption("religion", "Otra");
    const catolico = await findOption("religion", "Católico");

    await expect(
      moveCatalogOptionAction(otra.id, { targetOptionId: catolico.id }),
    ).resolves.toEqual({ status: "success" });
    expect(await listActiveLabels("religion")).toEqual([
      "Ninguna",
      "Otra",
      "Católico",
      "Judío",
      "Evangelista",
      "Mormón",
      "Testigo de Jehová",
    ]);

    await expect(
      moveCatalogOptionAction(otra.id, { targetOptionId: otra.id }),
    ).resolves.toEqual({ status: "success" });
    expect((await listActiveLabels("religion"))[1]).toBe("Otra");
  });

  it("RF-CAT-03: saltea las opciones inactivas y las conserva en el catálogo", async () => {
    await deactivateCatalogOptionAction(
      (await findOption("religion", "Católico")).id,
    );
    const judio = await findOption("religion", "Judío");

    await expect(
      moveCatalogOptionAction(judio.id, { direction: "up" }),
    ).resolves.toEqual({ status: "success" });
    expect((await listActiveLabels("religion")).slice(0, 2)).toEqual([
      "Judío",
      "Ninguna",
    ]);
    expect(await countOptions("religion")).toBe(7);
  });

  it("RF-CAT-03: rechaza mover fuera de los extremos, opciones inactivas u opciones de otro catálogo", async () => {
    const ninguna = await findOption("religion", "Ninguna");
    const otra = await findOption("religion", "Otra");
    const osde = await findOption("health_insurance", "OSDE");

    await expect(
      moveCatalogOptionAction(ninguna.id, { direction: "up" }),
    ).resolves.toEqual({
      status: "rejected",
      message: "La opción ya está en el primer lugar.",
    });
    await expect(
      moveCatalogOptionAction(otra.id, { direction: "down" }),
    ).resolves.toEqual({
      status: "rejected",
      message: "La opción ya está en el último lugar.",
    });
    await expect(
      moveCatalogOptionAction(otra.id, { targetOptionId: osde.id }),
    ).resolves.toEqual({
      status: "rejected",
      message: "Solo se puede mover entre opciones activas del mismo catálogo.",
    });
    await deactivateCatalogOptionAction(otra.id);
    await expect(
      moveCatalogOptionAction(otra.id, { targetOptionId: ninguna.id }),
    ).resolves.toEqual({
      status: "rejected",
      message: "Solo se puede mover entre opciones activas del mismo catálogo.",
    });
    expect((await listActiveLabels("religion"))[0]).toBe("Ninguna");
  });

  it("RF-CAT-03: Vínculos conserva su orden fijo", async () => {
    const otro = await findOption("relationship", "Otro");

    await expect(
      moveCatalogOptionAction(otro.id, { direction: "up" }),
    ).resolves.toEqual({
      status: "rejected",
      message:
        "Vínculos tiene un orden fijo: las opciones nuevas van al final.",
    });
    expect((await listActiveLabels("relationship")).at(-1)).toBe("Otro");
  });

  it("RF-CAT-03, CA-03: reordenar exige permiso de modificar el catálogo", async () => {
    await restrictSignedInUserTo([
      "admin.religion_options.view",
      "admin.religion_options.create",
      "admin.religion_options.delete",
    ]);
    const judio = await findOption("religion", "Judío");

    await expect(
      moveCatalogOptionAction(judio.id, { direction: "up" }),
    ).rejects.toMatchObject({ digest: FORBIDDEN_DIGEST });
    expect((await listActiveLabels("religion"))[2]).toBe("Judío");
  });
});
