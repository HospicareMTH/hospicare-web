// @vitest-environment node

import { sql } from "drizzle-orm";
import { beforeEach, describe, expect, it } from "vitest";

import { getDatabase } from "@/platform/database/client";
import { resetTestDatabase } from "@/platform/database/test-database";

import { countRecentDailyEvolutions } from "./service";
import { dailyEvolutions } from "./tables";

const NOW = new Date("2026-11-24T15:00:00Z");
const SIX_DAYS_AGO = new Date("2026-11-18T15:00:00Z");
const EIGHT_DAYS_AGO = new Date("2026-11-16T15:00:00Z");

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

async function insertEvolution(
  guestId: string,
  registeredAt: Date,
  annulment: { annulledAt: Date; annulmentReason: string } | null = null,
): Promise<void> {
  await getDatabase()
    .insert(dailyEvolutions)
    .values({
      guestId,
      signature: "Enfermería",
      text: "Evolución ficticia del día.",
      createdAt: registeredAt,
      editableUntil: registeredAt,
      updatedAt: registeredAt,
      ...annulment,
    });
}

describe("evolución diaria: reporte Seguimiento clínico", () => {
  beforeEach(async () => {
    await resetTestDatabase();
  });

  it("RF-DAS-02, 7.2: cuenta las evoluciones de los últimos 7 días, sin anuladas ni de huéspedes anulados", async () => {
    const guestId = await insertFictitiousGuestId(1);
    const annulledGuestId = await insertFictitiousGuestId(2, true);
    await insertEvolution(guestId, SIX_DAYS_AGO);
    await insertEvolution(guestId, NOW);
    await insertEvolution(guestId, EIGHT_DAYS_AGO);
    await insertEvolution(guestId, SIX_DAYS_AGO, {
      annulledAt: SIX_DAYS_AGO,
      annulmentReason: "Motivo ficticio de anulación",
    });
    await insertEvolution(annulledGuestId, SIX_DAYS_AGO);

    expect(await countRecentDailyEvolutions(NOW)).toBe(2);
  });

  it("RF-DAS-02: sin evoluciones, el indicador queda en cero", async () => {
    expect(await countRecentDailyEvolutions(NOW)).toBe(0);
  });
});
