// @vitest-environment node

import { describe, expect, it } from "vitest";

import type { Permission } from "../permissions";
import type { UserAccess } from "../authorization/service";
import { getAllowedAdminSections } from "./sections";

function listSectionLabels(permissions: Permission[]): string[] {
  const access: UserAccess = {
    userId: "usuario-ficticio",
    roleId: null,
    isSuperUser: false,
    permissions: new Set(permissions),
  };
  return getAllowedAdminSections(access).map((section) => section.label);
}

describe("secciones de Administración", () => {
  it("RF-CAT-01: muestra Catálogos con el permiso de ver cualquier catálogo", () => {
    expect(listSectionLabels(["admin.surgery_options.view"])).toEqual([
      "Catálogos",
    ]);
    expect(
      listSectionLabels(["admin.guest_clinical_catalog_options.view"]),
    ).toEqual(["Catálogos"]);
  });

  it("RF-ROL-09: oculta Catálogos sin permiso de ver catálogos", () => {
    expect(
      listSectionLabels(["admin.roles.view", "admin.surgery_options.create"]),
    ).toEqual(["Roles"]);
  });
});
