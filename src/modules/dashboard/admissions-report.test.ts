// @vitest-environment node

import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  type Permission,
  PERMISSION_GROUPS,
  type UserAccess,
} from "@/modules/access";
import { getAdmissionsReport } from "@/modules/admissions";
import { listAcceptedInterviewIds } from "@/modules/guests";

import { getAdmissionsReportFor } from "./service";

const ACCEPTED_INTERVIEW_ID = "entrevista-aceptada-ficticia";

vi.mock("@/modules/admissions", () => ({
  getAdmissionsReport: vi.fn(async () => ({
    windowDays: 7,
    createdInWindowCount: 3,
    activeCount: 9,
    acceptedCount: 4,
    pendingDecisionCount: 5,
  })),
}));

vi.mock("@/modules/guests", () => ({
  listAcceptedInterviewIds: vi.fn(async () => [ACCEPTED_INTERVIEW_ID]),
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
    vi.mocked(listAcceptedInterviewIds).mockClear();
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
    expect(listAcceptedInterviewIds).not.toHaveBeenCalled();
  });

  it("RF-DAS-02, 7.2: con su permiso devuelve los indicadores, con la conversión, y si puede abrir las entrevistas", async () => {
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
      activeCount: 9,
      acceptedCount: 4,
      pendingDecisionCount: 5,
      canViewInterviews: true,
    });
    expect(getAdmissionsReport).toHaveBeenCalledWith([ACCEPTED_INTERVIEW_ID]);
    await expect(
      getAdmissionsReportFor(createAccess(["dashboard.admissions.view"])),
    ).resolves.toMatchObject({ canViewInterviews: false });
  });
});
