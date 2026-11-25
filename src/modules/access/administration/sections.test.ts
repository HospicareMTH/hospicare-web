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

  it("RF-LOG-01, RF-ROL-09: muestra el Registro de actividad solo con su permiso", () => {
    expect(listSectionLabels(["admin.logs.view"])).toEqual([
      "Registro de actividad",
    ]);
    expect(listSectionLabels(["admin.roles.view"])).toEqual(["Roles"]);
  });

  it("RF-CFG-04, RF-ROL-09: muestra Configuración solo con su permiso de ver", () => {
    expect(listSectionLabels(["admin.system_settings.view"])).toEqual([
      "Configuración",
    ]);
    expect(listSectionLabels(["admin.system_settings.update"])).toEqual([]);
  });

  it("RF-ROL-09: oculta Catálogos sin permiso de ver catálogos", () => {
    expect(
      listSectionLabels(["admin.roles.view", "admin.surgery_options.create"]),
    ).toEqual(["Roles"]);
  });
});
