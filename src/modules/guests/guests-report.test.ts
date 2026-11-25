// @vitest-environment node

import { beforeEach, describe, expect, it } from "vitest";

import { resetTestDatabase } from "@/platform/database/test-database";

import {
  getGuestsReport,
  listAcceptedInterviewIds,
  listActiveGuestIds,
} from "./service";
import {
  findSeededOptionId,
  insertFictitiousInterviewId,
  insertGuest,
} from "./test-fixtures";

const ANNULMENT = {
  annulledAt: new Date("2026-11-13T15:00:00Z"),
  annulmentReason: "Motivo ficticio de anulación",
};

async function insertGuestId(
  overrides: Parameters<typeof insertGuest>[0],
): Promise<string> {
  const [guest] = await insertGuest(overrides);
  if (!guest) {
    throw new Error("No se creó el huésped de prueba.");
  }
  return guest.id;
}

describe("huéspedes: reporte del inicio", () => {
  beforeEach(async () => {
    await resetTestDatabase();
  });

  it("RF-DAS-02, 7.2: cuenta vigentes, los que ingresaron desde una entrevista y los que tienen obra social, sin anulados", async () => {
    const healthInsuranceOptionId = await findSeededOptionId(
      "health_insurance",
      "OSDE",
    );
    await insertGuest({
      clinicalRecordNumber: 1,
      origin: "admission",
      admissionInterviewId: await insertFictitiousInterviewId(),
      healthInsuranceOptionId,
    });
    await insertGuest({ clinicalRecordNumber: 2, healthInsuranceOptionId });
    await insertGuest({ clinicalRecordNumber: 3 });
    await insertGuest({
      clinicalRecordNumber: 4,
      origin: "admission",
      admissionInterviewId: await insertFictitiousInterviewId(),
      healthInsuranceOptionId,
      ...ANNULMENT,
    });

    expect(await getGuestsReport()).toEqual({
      activeCount: 3,
      fromAdmissionCount: 1,
      withHealthInsuranceCount: 2,
    });
  });

  it("RF-DAS-02: sin huéspedes, los indicadores quedan en cero", async () => {
    expect(await getGuestsReport()).toEqual({
      activeCount: 0,
      fromAdmissionCount: 0,
      withHealthInsuranceCount: 0,
    });
  });

  it("7.2: lista solo las entrevistas con huésped vigente", async () => {
    const acceptedInterviewId = await insertFictitiousInterviewId();
    const reacceptedInterviewId = await insertFictitiousInterviewId();
    const annulledGuestInterviewId = await insertFictitiousInterviewId();
    await insertGuest({
      clinicalRecordNumber: 1,
      origin: "admission",
      admissionInterviewId: acceptedInterviewId,
    });
    await insertGuest({
      clinicalRecordNumber: 2,
      origin: "admission",
      admissionInterviewId: reacceptedInterviewId,
      ...ANNULMENT,
    });
    await insertGuest({
      clinicalRecordNumber: 3,
      origin: "admission",
      admissionInterviewId: reacceptedInterviewId,
    });
    await insertGuest({
      clinicalRecordNumber: 4,
      origin: "admission",
      admissionInterviewId: annulledGuestInterviewId,
      ...ANNULMENT,
    });

    expect((await listAcceptedInterviewIds()).toSorted()).toEqual(
      [acceptedInterviewId, reacceptedInterviewId].toSorted(),
    );
  });

  it("7.2: lista solo los huéspedes vigentes", async () => {
    const activeGuestId = await insertGuestId({ clinicalRecordNumber: 1 });
    await insertGuest({ clinicalRecordNumber: 2, ...ANNULMENT });

    expect(await listActiveGuestIds()).toEqual([activeGuestId]);
  });
});
