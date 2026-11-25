// @vitest-environment node

import { beforeEach, describe, expect, it } from "vitest";

import { resetTestDatabase } from "@/platform/database/test-database";

import { getAdmissionsReport } from "./service";
import { insertInterview } from "./test-fixtures";

type InterviewOverrides = Parameters<typeof insertInterview>[0];

async function insertInterviewId(
  overrides: InterviewOverrides,
): Promise<string> {
  const [interview] = await insertInterview(overrides);
  if (!interview) {
    throw new Error("No se creó la entrevista de prueba.");
  }
  return interview.id;
}

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

    expect(await getAdmissionsReport([], NOW)).toEqual({
      windowDays: 7,
      createdInWindowCount: 1,
      activeCount: 2,
      acceptedCount: 0,
      pendingDecisionCount: 2,
    });
  });

  it("7.2: las aceptadas cuentan para la conversión y dejan de estar pendientes", async () => {
    const acceptedId = await insertInterviewId({ createdAt: EIGHT_DAYS_AGO });
    await insertInterview({ createdAt: SIX_DAYS_AGO });
    await insertInterview({ createdAt: SIX_DAYS_AGO });

    expect(await getAdmissionsReport([acceptedId], NOW)).toEqual({
      windowDays: 7,
      createdInWindowCount: 2,
      activeCount: 3,
      acceptedCount: 1,
      pendingDecisionCount: 2,
    });
  });

  it("7.2: una entrevista anulada con huésped vigente no cuenta para la conversión", async () => {
    const annulledId = await insertInterviewId({
      createdAt: SIX_DAYS_AGO,
      annulledAt: SIX_DAYS_AGO,
      annulmentReason: "Motivo ficticio",
    });
    await insertInterview({ createdAt: SIX_DAYS_AGO });

    expect(await getAdmissionsReport([annulledId], NOW)).toMatchObject({
      activeCount: 1,
      acceptedCount: 0,
      pendingDecisionCount: 1,
    });
  });

  it("RF-DAS-02: sin entrevistas, los indicadores quedan en cero", async () => {
    expect(await getAdmissionsReport([], NOW)).toEqual({
      windowDays: 7,
      createdInWindowCount: 0,
      activeCount: 0,
      acceptedCount: 0,
      pendingDecisionCount: 0,
    });
  });
});
