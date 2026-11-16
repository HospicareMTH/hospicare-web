import { describe, expect, it } from "vitest";

import {
  type Permission,
  PERMISSION_GROUPS,
  type UserAccess,
} from "@/modules/access";

import { listVisibleManualSections } from "./service";

function createAccess(permissions: readonly Permission[]): UserAccess {
  return {
    userId: "usuario-ficticio",
    roleId: null,
    isSuperUser: false,
    permissions: new Set(permissions),
  };
}

const ALL_PERMISSIONS = PERMISSION_GROUPS.flatMap((group) =>
  group.permissions.map((permission) => permission.key),
);

function listSectionIds(permissions: readonly Permission[]): string[] {
  return listVisibleManualSections(createAccess(permissions)).map(
    (section) => section.id,
  );
}

describe("manual funcional", () => {
  it("RF-MAN-01, RF-ROL-03: el rol Usuario ve solo lo que puede usar", () => {
    expect(listSectionIds(["documentation.app.view"])).toEqual([
      "como-se-usa",
      "ingreso",
      "mi-cuenta",
    ]);
  });

  it("RF-MAN-01: con todos los permisos ve todas las secciones, en orden", () => {
    expect(listSectionIds(ALL_PERMISSIONS)).toEqual([
      "como-se-usa",
      "ingreso",
      "mi-cuenta",
      "inicio",
      "usuarios",
      "roles",
      "invitaciones",
      "catalogos",
    ]);
  });

  it("muestra cada sección de Administración según su permiso de ver", () => {
    expect(
      listSectionIds(["documentation.app.view", "admin.religion_options.view"]),
    ).toContain("catalogos");
    expect(
      listSectionIds([
        "documentation.app.view",
        "admin.healthcare_professionals.view",
      ]),
    ).toContain("catalogos");
    expect(
      listSectionIds(["documentation.app.view", "admin.invitations.view"]),
    ).toEqual(["como-se-usa", "ingreso", "mi-cuenta", "invitaciones"]);
  });

  it("RF-MAN-02: cada sección dice qué hace, quién la usa, cómo se usa y sus reglas", () => {
    const sections = listVisibleManualSections(createAccess(ALL_PERMISSIONS));
    const ids = sections.map((section) => section.id);

    expect(new Set(ids).size).toBe(ids.length);
    for (const section of sections) {
      expect(section.summary.length).toBeGreaterThan(0);
      expect(section.audience.length).toBeGreaterThan(0);
      expect(section.topics.length).toBeGreaterThan(0);
      expect(section.rules.length).toBeGreaterThan(0);
    }
  });
});
