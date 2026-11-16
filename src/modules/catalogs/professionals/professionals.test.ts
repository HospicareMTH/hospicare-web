// @vitest-environment node

import { eq, sql } from "drizzle-orm";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { getDatabase, runInTransactionAs } from "@/platform/database/client";
import { resetTestDatabase } from "@/platform/database/test-database";

import {
  FORBIDDEN_DIGEST,
  restrictSignedInUserTo,
  signInAsSuperUser,
} from "../catalog-test-session";
import { healthcareProfessionals } from "../tables";
import {
  createHealthcareProfessionalAction,
  deactivateHealthcareProfessionalAction,
  reactivateHealthcareProfessionalAction,
  updateHealthcareProfessionalAction,
} from "./actions";
import { parseHealthcareProfessionalListQuery } from "./list-query";
import { searchHealthcareProfessionals } from "./service";

vi.mock("next/headers", async () => {
  const session = await import("../catalog-test-session");
  return { headers: async () => session.testRequestHeaders.current };
});
vi.mock("next/cache", () => ({ refresh: vi.fn() }));

const UNIQUE_VIOLATION = { cause: { code: "23505" } };
const PERMISSION_DENIED = { cause: { code: "42501" } };

const EMPTY_DETAILS = {
  fullName: "",
  specialty: "",
  licenseNumber: "",
  phone: "",
  email: "",
};

const CLINICAL_DOCTOR = {
  ...EMPTY_DETAILS,
  fullName: "Dra. Ficticia Médica",
  specialty: "Clínica médica",
  licenseNumber: "MN 00000",
  phone: "011 0000-0000",
  email: "Ficticia.Medica@Hospicare.test",
};

type AuditEntry = {
  action: string;
  operation: string;
  actor_user_id: string | null;
  previous_value: Record<string, unknown> | null;
  new_value: Record<string, unknown> | null;
};

async function listProfessionalAuditEntries(
  professionalId: string,
): Promise<AuditEntry[]> {
  const result = await getDatabase().execute<AuditEntry>(
    sql`select action, operation, actor_user_id, previous_value, new_value
        from audit_log
        where resource = 'healthcare_professional' and resource_id = ${professionalId}
        order by id`,
  );
  return result.rows;
}

async function findProfessional(fullName: string) {
  const [professional] = await getDatabase()
    .select()
    .from(healthcareProfessionals)
    .where(eq(healthcareProfessionals.fullName, fullName));
  if (!professional) {
    throw new Error(`No existe el profesional de prueba ${fullName}.`);
  }
  return professional;
}

async function countProfessionals(): Promise<number> {
  return (await getDatabase().select().from(healthcareProfessionals)).length;
}

async function listNames(parameters: Record<string, string> = {}) {
  const page = await searchHealthcareProfessionals(
    parseHealthcareProfessionalListQuery(parameters),
  );
  return page.items.map((professional) => professional.fullName);
}

describe("profesionales de salud: base", () => {
  beforeEach(async () => {
    await resetTestDatabase();
  });

  it("parte vacío y la aplicación no puede borrar profesionales físicamente (RN-04, RNF-10)", async () => {
    expect(await countProfessionals()).toBe(0);
    await expect(
      getDatabase().execute(sql`delete from healthcare_professionals`),
    ).rejects.toMatchObject(PERMISSION_DENIED);
  });

  it("RF-EVO-03: no admite dos profesionales activos con el mismo correo", async () => {
    const database = getDatabase();
    await database.insert(healthcareProfessionals).values({
      fullName: "Primer Ficticio",
      email: "repetido@hospicare.test",
      isActive: false,
    });
    await database.insert(healthcareProfessionals).values({
      fullName: "Segundo Ficticio",
      email: "repetido@hospicare.test",
    });

    await expect(
      database.insert(healthcareProfessionals).values({
        fullName: "Tercer Ficticio",
        email: "repetido@hospicare.test",
      }),
    ).rejects.toMatchObject(UNIQUE_VIOLATION);
  });

  it("RN-20: registra alta, edición, desactivación y reactivación con valores anterior y nuevo", async () => {
    const actorUserId = await signInAsSuperUser();
    const professionalId = await runInTransactionAs(
      actorUserId,
      async (transaction) => {
        const [professional] = await transaction
          .insert(healthcareProfessionals)
          .values({ fullName: "Dr. Ficticio" })
          .returning({ id: healthcareProfessionals.id });
        if (!professional) {
          throw new Error("No se creó el profesional de prueba.");
        }
        const byId = eq(healthcareProfessionals.id, professional.id);
        await transaction
          .update(healthcareProfessionals)
          .set({ specialty: "Psicología" })
          .where(byId);
        await transaction
          .update(healthcareProfessionals)
          .set({ isActive: false })
          .where(byId);
        await transaction
          .update(healthcareProfessionals)
          .set({ isActive: true })
          .where(byId);
        return professional.id;
      },
    );

    const entries = await listProfessionalAuditEntries(professionalId);

    expect(
      entries.map(({ action, operation }) => ({ action, operation })),
    ).toEqual([
      { action: "healthcare_professional.created", operation: "create" },
      { action: "healthcare_professional.updated", operation: "update" },
      { action: "healthcare_professional.deactivated", operation: "delete" },
      { action: "healthcare_professional.reactivated", operation: "update" },
    ]);
    expect(entries.every((entry) => entry.actor_user_id === actorUserId)).toBe(
      true,
    );
    expect(entries[1]?.previous_value?.specialty).toBeNull();
    expect(entries[1]?.new_value?.specialty).toBe("Psicología");
  });
});

describe("profesionales de salud: cambios", () => {
  let superUserId: string;

  beforeEach(async () => {
    vi.stubEnv("__NEXT_EXPERIMENTAL_AUTH_INTERRUPTS", "true");
    await resetTestDatabase();
    superUserId = await signInAsSuperUser();
  });

  it("RF-CAT-01, RN-20: crea un profesional con su responsable y correo en minúsculas", async () => {
    await expect(
      createHealthcareProfessionalAction(CLINICAL_DOCTOR),
    ).resolves.toEqual({ status: "success", wasReactivated: false });

    expect(await findProfessional("Dra. Ficticia Médica")).toMatchObject({
      specialty: "Clínica médica",
      licenseNumber: "MN 00000",
      phone: "011 0000-0000",
      email: "ficticia.medica@hospicare.test",
      isActive: true,
      createdByUserId: superUserId,
    });
  });

  it("solo exige el nombre y guarda vacíos los demás datos", async () => {
    await createHealthcareProfessionalAction({
      ...EMPTY_DETAILS,
      fullName: "  Lic. Ficticio  ",
    });

    expect(await findProfessional("Lic. Ficticio")).toMatchObject({
      specialty: null,
      licenseNumber: null,
      phone: null,
      email: null,
    });
  });

  it("rechaza nombre corto, correo inválido y textos de más de 120 caracteres", async () => {
    const result = await createHealthcareProfessionalAction({
      fullName: "A",
      specialty: "E".repeat(121),
      licenseNumber: "M".repeat(121),
      phone: "1".repeat(121),
      email: "no-es-un-correo",
    });

    expect(result).toMatchObject({
      status: "invalid",
      fieldErrors: {
        fullName: [expect.any(String)],
        specialty: [expect.any(String)],
        licenseNumber: [expect.any(String)],
        phone: [expect.any(String)],
        email: [expect.any(String)],
      },
    });
    expect(await countProfessionals()).toBe(0);
  });

  it("RF-CAT-06: rechaza un correo de otro profesional activo al crear y al editar", async () => {
    await createHealthcareProfessionalAction(CLINICAL_DOCTOR);
    await createHealthcareProfessionalAction({
      ...EMPTY_DETAILS,
      fullName: "Enf. Ficticia",
    });
    const nurse = await findProfessional("Enf. Ficticia");
    const duplicateEmailError = {
      status: "invalid",
      fieldErrors: {
        email: [
          "Ya hay un profesional activo con el correo ficticia.medica@hospicare.test.",
        ],
      },
    };

    await expect(
      createHealthcareProfessionalAction({
        ...CLINICAL_DOCTOR,
        fullName: "Otra Persona Ficticia",
      }),
    ).resolves.toEqual(duplicateEmailError);
    await expect(
      updateHealthcareProfessionalAction(nurse.id, {
        ...EMPTY_DETAILS,
        fullName: "Enf. Ficticia",
        email: "ficticia.medica@hospicare.test",
      }),
    ).resolves.toEqual(duplicateEmailError);
    expect(await countProfessionals()).toBe(2);
  });

  it("RF-CAT-06: con permiso de crear, un correo inactivo reactiva al profesional con los datos nuevos", async () => {
    await createHealthcareProfessionalAction(CLINICAL_DOCTOR);
    const doctor = await findProfessional("Dra. Ficticia Médica");
    await deactivateHealthcareProfessionalAction(doctor.id);
    await restrictSignedInUserTo([
      "admin.healthcare_professionals.view",
      "admin.healthcare_professionals.create",
    ]);

    await expect(
      createHealthcareProfessionalAction({
        ...CLINICAL_DOCTOR,
        fullName: "Dra. Ficticia Médica Paliativista",
        specialty: "Cuidados paliativos",
      }),
    ).resolves.toEqual({ status: "success", wasReactivated: true });

    expect(
      await findProfessional("Dra. Ficticia Médica Paliativista"),
    ).toMatchObject({
      id: doctor.id,
      specialty: "Cuidados paliativos",
      isActive: true,
    });
    expect(await countProfessionals()).toBe(1);
  });

  it("RF-CAT-01, RF-CAT-02: edita, desactiva conservando el registro y reactiva", async () => {
    await createHealthcareProfessionalAction(CLINICAL_DOCTOR);
    const doctor = await findProfessional("Dra. Ficticia Médica");

    await expect(
      updateHealthcareProfessionalAction(doctor.id, {
        ...CLINICAL_DOCTOR,
        phone: "",
      }),
    ).resolves.toEqual({ status: "success" });
    await expect(
      deactivateHealthcareProfessionalAction(doctor.id),
    ).resolves.toEqual({ status: "success" });
    expect(await findProfessional("Dra. Ficticia Médica")).toMatchObject({
      phone: null,
      isActive: false,
    });

    await expect(
      reactivateHealthcareProfessionalAction(doctor.id),
    ).resolves.toEqual({ status: "success" });
    expect((await findProfessional("Dra. Ficticia Médica")).isActive).toBe(
      true,
    );
  });

  it("no reactiva si otro profesional activo ya usa su correo", async () => {
    await createHealthcareProfessionalAction(CLINICAL_DOCTOR);
    const doctor = await findProfessional("Dra. Ficticia Médica");
    await deactivateHealthcareProfessionalAction(doctor.id);
    await getDatabase().insert(healthcareProfessionals).values({
      fullName: "Reemplazo Ficticio",
      email: "ficticia.medica@hospicare.test",
    });

    await expect(
      reactivateHealthcareProfessionalAction(doctor.id),
    ).resolves.toEqual({
      status: "rejected",
      message:
        "No se puede reactivar: ya hay un profesional activo con el correo ficticia.medica@hospicare.test.",
    });
    expect((await findProfessional("Dra. Ficticia Médica")).isActive).toBe(
      false,
    );
  });

  it("CA-03, RF-ROL-08: sin permiso de profesionales el servidor rechaza sin cambiar datos", async () => {
    await createHealthcareProfessionalAction(CLINICAL_DOCTOR);
    const doctor = await findProfessional("Dra. Ficticia Médica");
    await restrictSignedInUserTo(["admin.healthcare_professionals.view"]);

    await expect(
      createHealthcareProfessionalAction({
        ...EMPTY_DETAILS,
        fullName: "Sin Permiso Ficticio",
      }),
    ).rejects.toMatchObject({ digest: FORBIDDEN_DIGEST });
    await expect(
      updateHealthcareProfessionalAction(doctor.id, {
        ...CLINICAL_DOCTOR,
        specialty: "Otra",
      }),
    ).rejects.toMatchObject({ digest: FORBIDDEN_DIGEST });
    await expect(
      deactivateHealthcareProfessionalAction(doctor.id),
    ).rejects.toMatchObject({ digest: FORBIDDEN_DIGEST });
    await expect(
      reactivateHealthcareProfessionalAction(doctor.id),
    ).rejects.toMatchObject({ digest: FORBIDDEN_DIGEST });

    expect(await findProfessional("Dra. Ficticia Médica")).toMatchObject({
      specialty: "Clínica médica",
      isActive: true,
    });
    expect(await countProfessionals()).toBe(1);
  });

  it("lista en orden alfabético, con filtro de estado y búsqueda sin acentos", async () => {
    await createHealthcareProfessionalAction({
      ...EMPTY_DETAILS,
      fullName: "Zulema Ficticia",
      specialty: "Psicología",
    });
    await createHealthcareProfessionalAction(CLINICAL_DOCTOR);
    await createHealthcareProfessionalAction({
      ...EMPTY_DETAILS,
      fullName: "Ángel Ficticio",
    });
    await deactivateHealthcareProfessionalAction(
      (await findProfessional("Zulema Ficticia")).id,
    );

    expect(await listNames()).toEqual([
      "Ángel Ficticio",
      "Dra. Ficticia Médica",
    ]);
    expect(await listNames({ estado: "inactivos" })).toEqual([
      "Zulema Ficticia",
    ]);
    expect(await listNames({ estado: "todos", buscar: "psicologia" })).toEqual([
      "Zulema Ficticia",
    ]);
    expect(await listNames({ buscar: "MN 00000" })).toEqual([
      "Dra. Ficticia Médica",
    ]);
  });
});
