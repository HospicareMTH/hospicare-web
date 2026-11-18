import { describe, expect, it } from "vitest";

import type { Permission, UserAccess } from "@/modules/access";

import { listSearchEntries, type SearchEntryGroup } from "./service";

function createAccess(permissions: readonly Permission[]): UserAccess {
  return {
    userId: "usuario-ficticio",
    roleId: null,
    isSuperUser: false,
    permissions: new Set(permissions),
  };
}

function listLabels(
  permissions: readonly Permission[],
  group: SearchEntryGroup,
): string[] {
  return listSearchEntries(createAccess(permissions))
    .filter((entry) => entry.group === group)
    .map((entry) => entry.label);
}

describe("buscador global", () => {
  it("RF-BUS-02, RF-ROL-03: el rol Usuario encuentra solo las pantallas y secciones que puede abrir", () => {
    expect(listLabels(["documentation.app.view"], "screens")).toEqual([
      "Inicio",
      "Documentación",
      "Mi cuenta",
    ]);
    expect(listLabels(["documentation.app.view"], "manual")).toEqual([
      "Cómo se usa el sistema",
      "Ingreso",
      "Mi cuenta",
    ]);
  });

  it("RF-BUS-02: suma las secciones de Administración y del manual según cada permiso", () => {
    const permissions: Permission[] = [
      "documentation.app.view",
      "admin.logs.view",
    ];

    expect(listLabels(permissions, "screens")).toEqual([
      "Inicio",
      "Administración",
      "Documentación",
      "Mi cuenta",
      "Registro de actividad",
    ]);
    expect(listLabels(permissions, "manual")).toContain(
      "Registro de actividad",
    );
  });

  it("RF-MAN-01, RF-BUS-02: sin permiso para el manual no ofrece sus secciones", () => {
    expect(listLabels(["admin.logs.view"], "manual")).toEqual([]);
  });

  it("RF-BUS-02: cada resultado lleva a su pantalla", () => {
    const entries = listSearchEntries(
      createAccess(["documentation.app.view", "admin.logs.view"]),
    );

    expect(entries).toContainEqual({
      label: "Registro de actividad",
      href: "/admin/actividad",
      group: "screens",
    });
    expect(entries).toContainEqual({
      label: "Registro de actividad",
      href: "/documentacion/registro-de-actividad",
      group: "manual",
    });
  });
});
