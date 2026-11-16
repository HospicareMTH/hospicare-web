// @vitest-environment node

import { sql } from "drizzle-orm";
import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  type Permission,
  PERMISSION_GROUPS,
  type UserAccess,
} from "@/modules/access";
import { countActiveCatalogEntries } from "@/modules/catalogs";
import { getDatabase } from "@/platform/database/client";
import { resetTestDatabase } from "@/platform/database/test-database";

import { getDataQualityReport } from "./service";

vi.mock("@/modules/catalogs", async (importOriginal) => {
  const catalogs = await importOriginal<typeof import("@/modules/catalogs")>();
  return {
    ...catalogs,
    countActiveCatalogEntries: vi.fn(catalogs.countActiveCatalogEntries),
  };
});

function createAccess(permissions: readonly Permission[]): UserAccess {
  return {
    userId: "usuario-ficticio",
    roleId: null,
    isSuperUser: false,
    permissions: new Set(permissions),
  };
}

const REPORT_READER = createAccess(["dashboard.data_quality.view"]);

function findActiveCount(
  entries: { slug: string; activeCount: number }[],
  slug: string,
): number | undefined {
  return entries.find((entry) => entry.slug === slug)?.activeCount;
}

describe("inicio: reporte Calidad de datos", () => {
  beforeEach(async () => {
    vi.mocked(countActiveCatalogEntries).mockClear();
    await resetTestDatabase();
  });

  it("RF-DAS-01, CA-20: sin su permiso no consulta ni devuelve el reporte", async () => {
    const accessWithoutReport = createAccess(
      PERMISSION_GROUPS.flatMap((group) =>
        group.permissions.map((permission) => permission.key),
      ).filter((permission) => permission !== "dashboard.data_quality.view"),
    );

    await expect(getDataQualityReport(accessWithoutReport)).resolves.toBeNull();
    expect(countActiveCatalogEntries).not.toHaveBeenCalled();
  });

  it("RF-DAS-02: cuenta las opciones activas de cada catálogo, incluidos los profesionales", async () => {
    const database = getDatabase();
    await database.execute(
      sql`update catalog_options set is_active = false where catalog = 'religion' and label = 'Otra'`,
    );
    await database.execute(
      sql`insert into healthcare_professionals (full_name, is_active) values ('Activo Ficticio', true), ('Inactivo Ficticio', false)`,
    );

    const report = await getDataQualityReport(REPORT_READER);
    const entries = report?.activeCatalogEntries ?? [];

    expect(entries.map((entry) => entry.slug).slice(0, 2)).toEqual([
      "vinculos",
      "profesionales-de-salud",
    ]);
    expect(entries).toHaveLength(28);
    expect(findActiveCount(entries, "vinculos")).toBe(8);
    expect(findActiveCount(entries, "religion")).toBe(6);
    expect(findActiveCount(entries, "cirugia")).toBe(0);
    expect(findActiveCount(entries, "profesionales-de-salud")).toBe(1);
    expect(entries.every((entry) => entry.href === null)).toBe(true);
  });

  it("enlaza solo los catálogos que el rol puede ver", async () => {
    const report = await getDataQualityReport(
      createAccess([
        "dashboard.data_quality.view",
        "admin.religion_options.view",
      ]),
    );
    const linkedSlugs = report?.activeCatalogEntries
      .filter((entry) => entry.href !== null)
      .map((entry) => entry.slug);

    expect(linkedSlugs).toEqual(["religion"]);
  });
});
