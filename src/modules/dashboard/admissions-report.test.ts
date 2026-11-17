// @vitest-environment node

import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  type Permission,
  PERMISSION_GROUPS,
  type UserAccess,
} from "@/modules/access";
import { getAdmissionsReport } from "@/modules/admissions";

import { getAdmissionsReportFor } from "./service";

vi.mock("@/modules/admissions", () => ({
  getAdmissionsReport: vi.fn(async () => ({
    windowDays: 7,
    createdInWindowCount: 3,
    pendingDecisionCount: 5,
  })),
}));

function createAccess(permissions: readonly Permission[]): UserAccess {
  return {
    userId: "usuario-ficticio",
    roleId: null,
    isSuperUser: false,
    permissions: new Set(permissions),
  };
}

describe("inicio: reporte Admisiones", () => {
  beforeEach(() => {
    vi.mocked(getAdmissionsReport).mockClear();
  });

  it("RF-DAS-01, CA-20: sin su permiso no consulta ni devuelve el reporte", async () => {
    const accessWithoutReport = createAccess(
      PERMISSION_GROUPS.flatMap((group) =>
        group.permissions.map((permission) => permission.key),
      ).filter((permission) => permission !== "dashboard.admissions.view"),
    );

    await expect(
      getAdmissionsReportFor(accessWithoutReport),
    ).resolves.toBeNull();
    expect(getAdmissionsReport).not.toHaveBeenCalled();
  });

  it("RF-DAS-02: con su permiso devuelve los indicadores y si puede abrir las entrevistas", async () => {
    await expect(
      getAdmissionsReportFor(
        createAccess([
          "dashboard.admissions.view",
          "admissions.interviews.view",
        ]),
      ),
    ).resolves.toEqual({
      windowDays: 7,
      createdInWindowCount: 3,
      pendingDecisionCount: 5,
      canViewInterviews: true,
    });
    await expect(
      getAdmissionsReportFor(createAccess(["dashboard.admissions.view"])),
    ).resolves.toMatchObject({ canViewInterviews: false });
  });
});
