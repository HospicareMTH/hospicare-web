// @vitest-environment node

import { beforeEach, describe, expect, it } from "vitest";

import { resetTestDatabase } from "@/platform/database/test-database";

import {
  DEFAULT_ADMISSION_INTERVIEW_SORT,
  parseAdmissionInterviewListQuery,
  type AdmissionInterviewListQuery,
} from "./schemas";
import { searchAdmissionInterviews } from "./service";
import {
  deactivateCatalogOption,
  findSeededOptionId,
  insertHealthcareProfessional,
  insertInterview,
} from "./test-fixtures";

function buildQuery(
  overrides: Partial<AdmissionInterviewListQuery> = {},
): AdmissionInterviewListQuery {
  return {
    search: "",
    sort: DEFAULT_ADMISSION_INTERVIEW_SORT,
    page: 1,
    pageSize: 50,
    relationshipOptionId: null,
    primaryDoctorId: null,
    ...overrides,
  };
}

async function listGuestNames(
  overrides: Partial<AdmissionInterviewListQuery> = {},
): Promise<string[]> {
  const { page } = await searchAdmissionInterviews(buildQuery(overrides));
  return page.items.map((item) => item.guestFullName);
}

describe("admisiones: listado", () => {
  beforeEach(async () => {
    await resetTestDatabase();
  });

  it("RF-ENT-01: busca por huésped y entrevistado sin distinguir mayúsculas ni acentos", async () => {
    await insertInterview({ guestFirstName: "José", guestLastName: "Núñez" });
    await insertInterview({
      guestFirstName: "Marta",
      intervieweeFullName: "Ramón Ficticio",
    });

    expect(await listGuestNames({ search: "JOSE NÚÑEZ" })).toEqual([
      "José Núñez",
    ]);
    expect(await listGuestNames({ search: "jose" })).toEqual(["José Núñez"]);
    expect(await listGuestNames({ search: "ramon" })).toEqual([
      "Marta Ficticia",
    ]);
  });

  it("RF-ENT-01, RN-10: busca por DNI aunque se escriba con puntos", async () => {
    await insertInterview({ guestFirstName: "Luis", guestDni: "12345678" });
    await insertInterview({ guestFirstName: "Inés", guestDni: "23456789" });

    expect(await listGuestNames({ search: "12.345" })).toEqual([
      "Luis Ficticia",
    ]);
  });

  it("RF-ENT-01: un comodín escrito en la búsqueda se busca como texto", async () => {
    await insertInterview();

    expect(await listGuestNames({ search: "%" })).toEqual([]);
    expect(await listGuestNames({ search: "_" })).toEqual([]);
  });

  it("RF-ENT-01: filtra por vínculo y por médico de cabecera", async () => {
    const daughterOptionId = await findSeededOptionId("relationship", "Hija/o");
    const doctorId = await insertHealthcareProfessional("Médica Ficticia");
    await insertInterview({
      guestFirstName: "Con vínculo",
      intervieweeRelationshipOptionId: daughterOptionId,
    });
    await insertInterview({
      guestFirstName: "Con médico",
      primaryDoctorId: doctorId,
    });

    expect(
      await listGuestNames({ relationshipOptionId: daughterOptionId }),
    ).toEqual(["Con vínculo Ficticia"]);
    expect(await listGuestNames({ primaryDoctorId: doctorId })).toEqual([
      "Con médico Ficticia",
    ]);
  });

  it("RF-ENT-01: ordena por fecha, huésped, entrevistado y carga; por defecto, la entrevista más reciente primero", async () => {
    await insertInterview({
      guestFirstName: "Beatriz",
      interviewDate: "2026-11-01",
      intervieweeFullName: "Zoe Ficticia",
    });
    await insertInterview({
      guestFirstName: "Álvaro",
      interviewDate: "2026-11-05",
      intervieweeFullName: "Ana Ficticia",
    });
    await insertInterview({
      guestFirstName: "Carla",
      interviewDate: "2026-10-20",
      intervieweeFullName: "Mario Ficticio",
    });

    expect(await listGuestNames()).toEqual([
      "Álvaro Ficticia",
      "Beatriz Ficticia",
      "Carla Ficticia",
    ]);
    expect(
      await listGuestNames({
        sort: { key: "guestName", isDescending: false },
      }),
    ).toEqual(["Álvaro Ficticia", "Beatriz Ficticia", "Carla Ficticia"]);
    expect(
      await listGuestNames({
        sort: { key: "intervieweeName", isDescending: true },
      }),
    ).toEqual(["Beatriz Ficticia", "Carla Ficticia", "Álvaro Ficticia"]);
    expect(
      await listGuestNames({
        sort: { key: "createdAt", isDescending: false },
      }),
    ).toEqual(["Beatriz Ficticia", "Álvaro Ficticia", "Carla Ficticia"]);
  });

  it("RN-04, 8.2: las entrevistas anuladas salen del listado", async () => {
    await insertInterview({ guestFirstName: "Vigente" });
    await insertInterview({
      guestFirstName: "Anulada",
      annulledAt: new Date(),
      annulmentReason: "Motivo ficticio",
    });

    expect(await listGuestNames()).toEqual(["Vigente Ficticia"]);
  });

  it("RF-TAB-01: pagina en la base y muestra la última página si se pide una que no existe", async () => {
    for (let index = 0; index < 55; index += 1) {
      await insertInterview({
        guestFirstName: `Persona ${String(index).padStart(2, "0")}`,
      });
    }

    const { page } = await searchAdmissionInterviews(
      buildQuery({
        sort: { key: "guestName", isDescending: false },
        page: 9,
      }),
    );

    expect(page.totalCount).toBe(55);
    expect(page.page).toBe(2);
    expect(page.pageCount).toBe(2);
    expect(page.items.map((item) => item.guestFullName)).toEqual([
      "Persona 50 Ficticia",
      "Persona 51 Ficticia",
      "Persona 52 Ficticia",
      "Persona 53 Ficticia",
      "Persona 54 Ficticia",
    ]);
  });

  it("RF-ENT-03, RF-CAT-02: muestra etiquetas y ofrece en los filtros las opciones activas y las inactivas ya usadas", async () => {
    const otherOptionId = await findSeededOptionId("relationship", "Otro");
    await deactivateCatalogOption(otherOptionId);
    const formerDoctorId = await insertHealthcareProfessional(
      "Médico Anterior Ficticio",
      false,
    );
    await insertHealthcareProfessional("Médico Sin Uso Ficticio", false);
    await insertInterview({
      intervieweeRelationshipOptionId: otherOptionId,
      primaryDoctorId: formerDoctorId,
    });

    const { page, relationshipOptions, primaryDoctorOptions } =
      await searchAdmissionInterviews(buildQuery());

    expect(page.items[0]).toMatchObject({
      relationshipLabel: "Otro",
      primaryDoctorName: "Médico Anterior Ficticio",
    });
    expect(relationshipOptions.map((option) => option.label)).toContain("Otro");
    expect(primaryDoctorOptions.map((option) => option.label)).toEqual([
      "Médico Anterior Ficticio",
    ]);
  });

  it("RF-TAB-01: ignora filtros que no son identificadores válidos", () => {
    const query = parseAdmissionInterviewListQuery({
      vinculo: "no-es-un-id",
      medico: "' or 1=1",
    });

    expect(query.relationshipOptionId).toBeNull();
    expect(query.primaryDoctorId).toBeNull();
  });
});
