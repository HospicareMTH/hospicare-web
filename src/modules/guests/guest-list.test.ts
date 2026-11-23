// @vitest-environment node

import { eq } from "drizzle-orm";
import { beforeEach, describe, expect, it } from "vitest";

import { getDatabase } from "@/platform/database/client";
import { resetTestDatabase } from "@/platform/database/test-database";

import { DEFAULT_GUEST_SORT, type GuestListQuery } from "./schemas";
import { searchGuests } from "./service";
import { guests } from "./tables";
import {
  findSeededOptionId,
  insertFictitiousInterviewId,
  insertGuest,
} from "./test-fixtures";

function buildQuery(overrides: Partial<GuestListQuery> = {}): GuestListQuery {
  return {
    search: "",
    sort: DEFAULT_GUEST_SORT,
    page: 1,
    pageSize: 50,
    origin: null,
    ...overrides,
  };
}

async function listNames(overrides: Partial<GuestListQuery> = {}) {
  const page = await searchGuests(buildQuery(overrides));
  return page.items.map((guest) => guest.fullName);
}

async function insertFictitiousGuests(): Promise<void> {
  await insertGuest({
    clinicalRecordNumber: 1,
    hospitalizationDate: "2026-11-12",
    firstName: "Rosa",
    lastName: "Ficticia",
    dni: "11222333",
    origin: "admission",
    admissionInterviewId: await insertFictitiousInterviewId(),
    healthInsuranceOptionId: await findSeededOptionId(
      "health_insurance",
      "OSDE",
    ),
    healthInsuranceMemberNumber: "123456",
  });
  await insertGuest({
    clinicalRecordNumber: 102,
    hospitalizationDate: "2026-11-18",
    firstName: "José",
    lastName: "Ejemplo",
    dni: "9876543",
  });
  await insertGuest({
    clinicalRecordNumber: 1020,
    hospitalizationDate: "2026-11-20",
    firstName: "Ángela",
    lastName: "Prueba",
    dni: "20111222",
  });
}

describe("huéspedes: listado", () => {
  beforeEach(async () => {
    await resetTestDatabase();
    await insertFictitiousGuests();
  });

  it("RF-HUE-01: muestra número, obra social y origen, de la internación más reciente a la más antigua", async () => {
    const page = await searchGuests(buildQuery());

    expect(page.totalCount).toBe(3);
    expect(page.items.map((guest) => guest.fullName)).toEqual([
      "Ángela Prueba",
      "José Ejemplo",
      "Rosa Ficticia",
    ]);
    expect(page.items[2]).toMatchObject({
      clinicalRecordNumber: 1,
      healthInsuranceLabel: "OSDE",
      healthInsuranceMemberNumber: "123456",
      origin: "admission",
    });
  });

  it("RF-HUE-01: excluye a los huéspedes anulados", async () => {
    await getDatabase()
      .update(guests)
      .set({ annulledAt: new Date(), annulmentReason: "Carga duplicada" })
      .where(eq(guests.clinicalRecordNumber, 102));

    await expect(listNames()).resolves.toEqual([
      "Ángela Prueba",
      "Rosa Ficticia",
    ]);
  });

  it("RF-HUE-01: busca por nombre sin distinguir mayúsculas ni acentos", async () => {
    await expect(listNames({ search: "ANGELA" })).resolves.toEqual([
      "Ángela Prueba",
    ]);
    await expect(listNames({ search: "jose ejem" })).resolves.toEqual([
      "José Ejemplo",
    ]);
  });

  it("RF-HUE-01: busca por DNI escrito con puntos", async () => {
    await expect(listNames({ search: "9.876.543" })).resolves.toEqual([
      "José Ejemplo",
    ]);
  });

  it("RF-HUE-01: busca por número de historia clínica exacto", async () => {
    await expect(listNames({ search: "102" })).resolves.toEqual([
      "José Ejemplo",
    ]);
  });

  it("RF-HUE-01: busca por obra social", async () => {
    await expect(listNames({ search: "osde" })).resolves.toEqual([
      "Rosa Ficticia",
    ]);
  });

  it("RF-HUE-01: filtra por origen", async () => {
    await expect(listNames({ origin: "admission" })).resolves.toEqual([
      "Rosa Ficticia",
    ]);
    await expect(listNames({ origin: "manual" })).resolves.toEqual([
      "Ángela Prueba",
      "José Ejemplo",
    ]);
  });

  it("RF-HUE-01: ordena por DNI como número", async () => {
    await expect(
      listNames({ sort: { key: "dni", isDescending: false } }),
    ).resolves.toEqual(["José Ejemplo", "Rosa Ficticia", "Ángela Prueba"]);
  });

  it("RF-HUE-01: ordena por huésped y por fecha de carga", async () => {
    await expect(
      listNames({ sort: { key: "guestName", isDescending: false } }),
    ).resolves.toEqual(["Ángela Prueba", "José Ejemplo", "Rosa Ficticia"]);
    await expect(
      listNames({ sort: { key: "createdAt", isDescending: false } }),
    ).resolves.toEqual(["Rosa Ficticia", "José Ejemplo", "Ángela Prueba"]);
  });

  it("RF-TAB-01: pagina y ajusta una página fuera de rango", async () => {
    const page = await searchGuests(buildQuery({ page: 9 }));

    expect(page).toMatchObject({ page: 1, pageCount: 1, totalCount: 3 });
  });
});
