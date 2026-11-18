// @vitest-environment node

import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  type Permission,
  PERMISSION_GROUPS,
  type UserAccess,
} from "@/modules/access";
import { countAuditEntriesSince } from "@/modules/audit";

import { getAccessesReportFor } from "./service";

vi.mock("@/modules/audit", () => ({
  countAuditEntriesSince: vi.fn(async () => 12),
}));

function createAccess(permissions: readonly Permission[]): UserAccess {
  return {
    userId: "usuario-ficticio",
    roleId: null,
    isSuperUser: false,
    permissions: new Set(permissions),
  };
}

describe("inicio: reporte Accesos", () => {
  beforeEach(() => {
    vi.mocked(countAuditEntriesSince).mockClear();
  });

  it("RF-DAS-01, CA-20: sin su permiso no consulta ni devuelve el reporte", async () => {
    const accessWithoutReport = createAccess(
      PERMISSION_GROUPS.flatMap((group) =>
        group.permissions.map((permission) => permission.key),
      ).filter((permission) => permission !== "dashboard.accesses.view"),
    );

    await expect(getAccessesReportFor(accessWithoutReport)).resolves.toBeNull();
    expect(countAuditEntriesSince).not.toHaveBeenCalled();
  });

  it("RF-DAS-02, 7.2: cuenta la actividad de los últimos 7 días y dice si puede abrir el registro", async () => {
    const now = new Date("2026-11-17T12:00:00-03:00");

    await expect(
      getAccessesReportFor(
        createAccess(["dashboard.accesses.view", "admin.logs.view"]),
        now,
      ),
    ).resolves.toEqual({
      windowDays: 7,
      activityInWindowCount: 12,
      canViewActivityLog: true,
    });
    expect(countAuditEntriesSince).toHaveBeenCalledWith(
      new Date("2026-11-10T12:00:00-03:00"),
    );
    await expect(
      getAccessesReportFor(createAccess(["dashboard.accesses.view"]), now),
    ).resolves.toMatchObject({ canViewActivityLog: false });
  });
});
