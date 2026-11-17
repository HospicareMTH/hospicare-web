// @vitest-environment node

import { beforeEach, describe, expect, it } from "vitest";

import { resetTestDatabase } from "@/platform/database/test-database";

import { getAdmissionsReport } from "./service";
import { insertInterview } from "./test-fixtures";

const NOW = new Date("2026-11-17T15:00:00Z");
const EIGHT_DAYS_AGO = new Date("2026-11-09T15:00:00Z");
const SIX_DAYS_AGO = new Date("2026-11-11T15:00:00Z");

describe("admisiones: reporte del inicio", () => {
  beforeEach(async () => {
    await resetTestDatabase();
  });

  it("RF-DAS-02, 7.2: cuenta las cargadas en los últimos 7 días y las pendientes, sin anuladas", async () => {
    await insertInterview({ createdAt: SIX_DAYS_AGO });
    await insertInterview({ createdAt: EIGHT_DAYS_AGO });
    await insertInterview({
      createdAt: SIX_DAYS_AGO,
      annulledAt: SIX_DAYS_AGO,
      annulmentReason: "Motivo ficticio",
    });

    expect(await getAdmissionsReport(NOW)).toEqual({
      windowDays: 7,
      createdInWindowCount: 1,
      pendingDecisionCount: 2,
    });
  });

  it("RF-DAS-02: sin entrevistas, los indicadores quedan en cero", async () => {
    expect(await getAdmissionsReport(NOW)).toEqual({
      windowDays: 7,
      createdInWindowCount: 0,
      pendingDecisionCount: 0,
    });
  });
});
