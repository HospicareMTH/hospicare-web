// @vitest-environment node

import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  type Permission,
  PERMISSION_GROUPS,
  type UserAccess,
} from "@/modules/access";
import { getGuestsReport } from "@/modules/guests";

import { getGuestsReportFor } from "./service";

vi.mock("@/modules/guests", () => ({
  getGuestsReport: vi.fn(async () => ({
    activeCount: 12,
    fromAdmissionCount: 9,
    withHealthInsuranceCount: 10,
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

describe("inicio: reporte Huéspedes", () => {
  beforeEach(() => {
    vi.mocked(getGuestsReport).mockClear();
  });

  it("RF-DAS-01, CA-20: sin su permiso no consulta ni devuelve el reporte", async () => {
    const accessWithoutReport = createAccess(
      PERMISSION_GROUPS.flatMap((group) =>
        group.permissions.map((permission) => permission.key),
      ).filter((permission) => permission !== "dashboard.guests.view"),
    );

    await expect(getGuestsReportFor(accessWithoutReport)).resolves.toBeNull();
    expect(getGuestsReport).not.toHaveBeenCalled();
  });

  it("RF-DAS-02: con su permiso devuelve los indicadores y si puede abrir el listado", async () => {
    await expect(
      getGuestsReportFor(
        createAccess(["dashboard.guests.view", "guests.records.view"]),
      ),
    ).resolves.toEqual({
      activeCount: 12,
      fromAdmissionCount: 9,
      withHealthInsuranceCount: 10,
      canViewGuests: true,
    });
    await expect(
      getGuestsReportFor(createAccess(["dashboard.guests.view"])),
    ).resolves.toMatchObject({ canViewGuests: false });
  });
});
