import { describe, expect, it } from "vitest";

import {
  type Permission,
  PERMISSION_GROUPS,
  type UserAccess,
} from "@/modules/access";

import { findVisibleManualSection, listVisibleManualSections } from "./service";

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
      "admisiones",
      "huespedes",
      "evaluaciones",
      "evolucion-diaria",
      "usuarios",
      "roles",
      "invitaciones",
      "catalogos",
      "configuracion",
      "registro-de-actividad",
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

  it("RF-MAN-02: Admisiones se ve con permiso de ver entrevistas, e Inicio con cualquiera de sus reportes", () => {
    expect(
      listSectionIds(["documentation.app.view", "admissions.interviews.view"]),
    ).toEqual(["como-se-usa", "ingreso", "mi-cuenta", "admisiones"]);
    expect(
      listSectionIds(["documentation.app.view", "dashboard.admissions.view"]),
    ).toEqual(["como-se-usa", "ingreso", "mi-cuenta", "inicio"]);
  });

  it("RF-MAN-02, RF-LOG-01: el Registro de actividad se ve con su permiso, e Inicio con el reporte Accesos", () => {
    expect(
      listSectionIds(["documentation.app.view", "admin.logs.view"]),
    ).toEqual(["como-se-usa", "ingreso", "mi-cuenta", "registro-de-actividad"]);
    expect(
      listSectionIds(["documentation.app.view", "dashboard.accesses.view"]),
    ).toEqual(["como-se-usa", "ingreso", "mi-cuenta", "inicio"]);
  });

  it("RF-MAN-02: Huéspedes, Evaluaciones, Evolución diaria y Configuración se ven con su permiso de ver", () => {
    expect(
      listSectionIds(["documentation.app.view", "guests.records.view"]),
    ).toEqual(["como-se-usa", "ingreso", "mi-cuenta", "huespedes"]);
    expect(
      listSectionIds(["documentation.app.view", "guests.cam_evaluations.view"]),
    ).toEqual(["como-se-usa", "ingreso", "mi-cuenta", "evaluaciones"]);
    expect(
      listSectionIds([
        "documentation.app.view",
        "guests.physical_evaluations.view",
      ]),
    ).toEqual(["como-se-usa", "ingreso", "mi-cuenta", "evaluaciones"]);
    expect(
      listSectionIds([
        "documentation.app.view",
        "guests.daily_evolutions.view",
      ]),
    ).toEqual(["como-se-usa", "ingreso", "mi-cuenta", "evolucion-diaria"]);
    expect(
      listSectionIds(["documentation.app.view", "admin.system_settings.view"]),
    ).toEqual(["como-se-usa", "ingreso", "mi-cuenta", "configuracion"]);
  });

  it("RF-MAN-02: Inicio se ve con el reporte Huéspedes o con Seguimiento clínico", () => {
    expect(
      listSectionIds(["documentation.app.view", "dashboard.guests.view"]),
    ).toEqual(["como-se-usa", "ingreso", "mi-cuenta", "inicio"]);
    expect(
      listSectionIds([
        "documentation.app.view",
        "dashboard.clinical_follow_up.view",
      ]),
    ).toEqual(["como-se-usa", "ingreso", "mi-cuenta", "inicio"]);
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

  it("RF-MAN-01: abre una sección visible por su dirección", () => {
    const lookup = findVisibleManualSection(
      createAccess(["documentation.app.view"]),
      "ingreso",
    );

    expect(lookup.status).toBe("visible");
  });

  it("RF-MAN-01, RF-ROL-08: rechaza una sección sin permiso", () => {
    expect(
      findVisibleManualSection(
        createAccess(["documentation.app.view"]),
        "usuarios",
      ),
    ).toEqual({ status: "forbidden" });
  });

  it("RF-MAN-01: no encuentra una sección que no existe", () => {
    expect(
      findVisibleManualSection(createAccess(ALL_PERMISSIONS), "no-existe"),
    ).toEqual({ status: "missing" });
  });
});
