// @vitest-environment node

import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  type Permission,
  PERMISSION_GROUPS,
  type UserAccess,
} from "@/modules/access";
import { countRecentDailyEvolutions } from "@/modules/daily-evolutions";
import { getEvaluationFindingsReport } from "@/modules/evaluations";

import { getClinicalFollowUpReportFor } from "./service";

vi.mock("@/modules/evaluations", () => ({
  getEvaluationFindingsReport: vi.fn(async () => ({
    camEvaluatedCount: 8,
    deliriumLikelyCount: 2,
    physicalEvaluatedCount: 7,
    pressureUlcerCount: 1,
  })),
}));

vi.mock("@/modules/daily-evolutions", () => ({
  countRecentDailyEvolutions: vi.fn(async () => 45),
}));

const NOW = new Date("2026-11-24T15:00:00Z");

function createAccess(permissions: readonly Permission[]): UserAccess {
  return {
    userId: "usuario-ficticio",
    roleId: null,
    isSuperUser: false,
    permissions: new Set(permissions),
  };
}

describe("inicio: reporte Seguimiento clínico", () => {
  beforeEach(() => {
    vi.mocked(getEvaluationFindingsReport).mockClear();
    vi.mocked(countRecentDailyEvolutions).mockClear();
  });

  it("RF-DAS-01, CA-20: sin su permiso no consulta ni devuelve el reporte", async () => {
    const accessWithoutReport = createAccess(
      PERMISSION_GROUPS.flatMap((group) =>
        group.permissions.map((permission) => permission.key),
      ).filter(
        (permission) => permission !== "dashboard.clinical_follow_up.view",
      ),
    );

    await expect(
      getClinicalFollowUpReportFor(accessWithoutReport, NOW),
    ).resolves.toBeNull();
    expect(getEvaluationFindingsReport).not.toHaveBeenCalled();
    expect(countRecentDailyEvolutions).not.toHaveBeenCalled();
  });

  it("RF-DAS-02, 7.2: con su permiso devuelve los hallazgos y las evoluciones de 7 días", async () => {
    await expect(
      getClinicalFollowUpReportFor(
        createAccess(["dashboard.clinical_follow_up.view"]),
        NOW,
      ),
    ).resolves.toEqual({
      camEvaluatedCount: 8,
      deliriumLikelyCount: 2,
      physicalEvaluatedCount: 7,
      pressureUlcerCount: 1,
      windowDays: 7,
      recentDailyEvolutionCount: 45,
    });
    expect(countRecentDailyEvolutions).toHaveBeenCalledWith(NOW);
  });
});
