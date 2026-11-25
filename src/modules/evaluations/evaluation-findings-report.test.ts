// @vitest-environment node

import { sql } from "drizzle-orm";
import { beforeEach, describe, expect, it } from "vitest";

import { getDatabase } from "@/platform/database/client";
import { resetTestDatabase } from "@/platform/database/test-database";

import {
  buildEmptyPhysicalEvaluation,
  ESAS_SYMPTOMS,
  type PhysicalEvaluationInput,
  physicalEvaluationSchema,
} from "./schemas";
import { getEvaluationFindingsReport } from "./service";
import { camEvaluations, physicalAdmissionEvaluations } from "./tables";

const DELIRIUM_LIKELY_CAM = {
  evaluationDate: "2026-11-20",
  acuteOnset: true,
  inattention: true,
  disorganizedThinking: true,
  alteredConsciousness: false,
  isDeliriumLikely: true,
  stoppedAtCriterion: null,
};

const NO_DELIRIUM_CAM = {
  evaluationDate: "2026-11-20",
  acuteOnset: false,
  inattention: null,
  disorganizedThinking: null,
  alteredConsciousness: null,
  isDeliriumLikely: false,
  stoppedAtCriterion: "acute_onset",
} as const;

const ALL_SCORES_ZERO = Object.fromEntries(
  ESAS_SYMPTOMS.map(({ key }) => [key, 0]),
);

const WITH_PRESSURE_ULCERS: Partial<PhysicalEvaluationInput> = {
  hasPressureUlcers: true,
  pressureUlcerStage: "II",
  pressureUlcerLocation: "Sacro",
};

async function insertFictitiousGuestId(
  clinicalRecordNumber: number,
  isAnnulled = false,
): Promise<string> {
  const annulledAt = isAnnulled ? "2026-11-21T15:00:00Z" : null;
  const annulmentReason = isAnnulled ? "Motivo ficticio de anulación" : null;
  const result = await getDatabase().execute<{ id: string }>(
    sql`insert into guests (
          clinical_record_number, hospitalization_date, first_name, last_name,
          birth_date, dni, address, origin, annulled_at, annulment_reason
        ) values (
          ${clinicalRecordNumber}, '2026-11-12', 'Persona', 'Ficticia',
          '1950-01-01', '11222333', 'Calle Ficticia 123', 'manual',
          ${annulledAt}, ${annulmentReason}
        )
        returning id`,
  );
  const [guest] = result.rows;
  if (!guest) {
    throw new Error("No se creó el huésped de prueba.");
  }
  return guest.id;
}

async function insertPhysicalEvaluation(
  guestId: string,
  overrides: Partial<PhysicalEvaluationInput> = {},
): Promise<void> {
  const details = physicalEvaluationSchema.parse({
    ...buildEmptyPhysicalEvaluation("2026-11-20"),
    ...ALL_SCORES_ZERO,
    ...overrides,
  });
  await getDatabase()
    .insert(physicalAdmissionEvaluations)
    .values({ guestId, ...details });
}

describe("evaluaciones: reporte Seguimiento clínico", () => {
  beforeEach(async () => {
    await resetTestDatabase();
  });

  it("RF-DAS-02, 7.2: cuenta CAM con delirium probable y físicas con úlceras sobre los huéspedes vigentes evaluados", async () => {
    const firstGuestId = await insertFictitiousGuestId(1);
    const secondGuestId = await insertFictitiousGuestId(2);
    const thirdGuestId = await insertFictitiousGuestId(3);
    await getDatabase()
      .insert(camEvaluations)
      .values([
        { guestId: firstGuestId, ...DELIRIUM_LIKELY_CAM },
        { guestId: secondGuestId, ...NO_DELIRIUM_CAM },
      ]);
    await insertPhysicalEvaluation(firstGuestId, WITH_PRESSURE_ULCERS);
    await insertPhysicalEvaluation(secondGuestId);
    await insertPhysicalEvaluation(thirdGuestId);

    expect(await getEvaluationFindingsReport()).toEqual({
      camEvaluatedCount: 2,
      deliriumLikelyCount: 1,
      physicalEvaluatedCount: 3,
      pressureUlcerCount: 1,
    });
  });

  it("7.2: no cuenta las evaluaciones de huéspedes anulados", async () => {
    const annulledGuestId = await insertFictitiousGuestId(1, true);
    await getDatabase()
      .insert(camEvaluations)
      .values({ guestId: annulledGuestId, ...DELIRIUM_LIKELY_CAM });
    await insertPhysicalEvaluation(annulledGuestId, WITH_PRESSURE_ULCERS);

    expect(await getEvaluationFindingsReport()).toEqual({
      camEvaluatedCount: 0,
      deliriumLikelyCount: 0,
      physicalEvaluatedCount: 0,
      pressureUlcerCount: 0,
    });
  });
});
