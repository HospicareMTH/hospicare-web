// @vitest-environment node

import { eq } from "drizzle-orm";
import { beforeEach, describe, expect, it } from "vitest";

import type { Permission, UserAccess } from "@/modules/access";
import { getDatabase } from "@/platform/database/client";
import { resetTestDatabase } from "@/platform/database/test-database";

import { CATALOG_DEFINITIONS } from "./definitions";
import { parseCatalogOptionListQuery } from "./schemas";
import {
  listVisibleCatalogs,
  resolveVisibleCatalog,
  searchCatalogOptions,
} from "./service";
import { catalog, catalogOptions } from "./tables";

function createAccess(permissions: Permission[]): UserAccess {
  return {
    userId: "usuario-ficticio",
    roleId: null,
    isSuperUser: false,
    permissions: new Set(permissions),
  };
}

const RELIGION_ONLY = createAccess(["admin.religion_options.view"]);
const GUESTS_ONLY = createAccess(["admin.guest_clinical_catalog_options.view"]);

describe("catálogos: definiciones", () => {
  it("define cada catálogo una sola vez, con su dirección propia", () => {
    const keys = CATALOG_DEFINITIONS.map((definition) => definition.key);
    const slugs = CATALOG_DEFINITIONS.map((definition) => definition.slug);

    expect([...keys].sort()).toEqual([...catalog.enumValues].sort());
    expect(new Set(slugs).size).toBe(slugs.length);
  });
});

describe("catálogos: visibilidad", () => {
  it("RF-CAT-01: muestra solo los catálogos que el rol puede ver", () => {
    expect(listVisibleCatalogs(RELIGION_ONLY).map((item) => item.key)).toEqual([
      "religion",
    ]);
    expect(
      listVisibleCatalogs(GUESTS_ONLY).every(
        (definition) => definition.group === "guests",
      ),
    ).toBe(true);
    expect(listVisibleCatalogs(GUESTS_ONLY)).toHaveLength(19);
  });

  it("abre el primer catálogo permitido si la dirección no indica uno válido", () => {
    expect(resolveVisibleCatalog(GUESTS_ONLY, undefined)?.key).toBe(
      "hospitalization_reason",
    );
    expect(resolveVisibleCatalog(RELIGION_ONLY, "no-existe")?.key).toBe(
      "religion",
    );
  });

  it("RF-ROL-08, RF-ROL-09: rechaza un catálogo sin permiso aunque se pida por dirección", () => {
    expect(resolveVisibleCatalog(RELIGION_ONLY, "vinculos")).toBeNull();
    expect(resolveVisibleCatalog(createAccess([]), undefined)).toBeNull();
  });
});

describe("catálogos: listado de opciones", () => {
  beforeEach(async () => {
    await resetTestDatabase();
  });

  it("RF-CAT-03: lista las opciones activas en su orden por defecto", async () => {
    await getDatabase()
      .update(catalogOptions)
      .set({ isActive: false })
      .where(eq(catalogOptions.label, "Testigo de Jehová"));

    const page = await searchCatalogOptions(
      "religion",
      parseCatalogOptionListQuery({}),
    );

    expect(page.items.map((option) => option.label)).toEqual([
      "Ninguna",
      "Católico",
      "Judío",
      "Evangelista",
      "Mormón",
      "Otra",
    ]);
    expect(page.items.map((option) => option.position)).toEqual([
      1, 2, 3, 4, 5, 7,
    ]);
  });

  it("filtra por inactivas o todas, y busca sin distinguir acentos", async () => {
    await getDatabase()
      .update(catalogOptions)
      .set({ isActive: false })
      .where(eq(catalogOptions.label, "Testigo de Jehová"));

    const inactivePage = await searchCatalogOptions(
      "religion",
      parseCatalogOptionListQuery({ estado: "inactivas" }),
    );
    const allPage = await searchCatalogOptions(
      "religion",
      parseCatalogOptionListQuery({ estado: "todas" }),
    );
    const searchPage = await searchCatalogOptions(
      "religion",
      parseCatalogOptionListQuery({ buscar: "judio" }),
    );

    expect(inactivePage.items.map((option) => option.label)).toEqual([
      "Testigo de Jehová",
    ]);
    expect(allPage.totalCount).toBe(7);
    expect(searchPage.items.map((option) => option.label)).toEqual(["Judío"]);
  });
});
