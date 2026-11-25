// @vitest-environment node

import { eq, sql } from "drizzle-orm";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { getDatabase } from "@/platform/database/client";
import { getBusinessDate } from "@/platform/dates";
import { resetTestDatabase } from "@/platform/database/test-database";
import {
  FORBIDDEN_DIGEST,
  restrictSignedInUserTo,
  signInAsSuperUser,
} from "@/testing/action-session";

import { acceptAdmissionInterviewAction, checkGuestDniAction } from "./actions";
import {
  acceptAdmissionInterview,
  findGuestOfInterview,
  INTERVIEW_ACCEPTANCE_REJECTION_MESSAGES,
} from "./service";
import { guests } from "./tables";
import {
  findSeededOptionId,
  insertFictitiousInterviewId,
} from "./test-fixtures";

vi.mock("next/headers", async () => {
  const session = await import("@/testing/action-session");
  return { headers: async () => session.testRequestHeaders.current };
});
vi.mock("next/cache", () => ({ refresh: vi.fn() }));

async function insertInterviewWithCoverage(): Promise<string> {
  const interviewId = await insertFictitiousInterviewId();
  await getDatabase().execute(
    sql`update admission_interviews
        set health_insurance_option_id = ${await findSeededOptionId("health_insurance", "OSDE")},
            health_insurance_member_number = '123456'
        where id = ${interviewId}`,
  );
  return interviewId;
}

async function listGuestAuditActions(): Promise<string[]> {
  const result = await getDatabase().execute<{ action: string }>(
    sql`select action from audit_log where resource = 'guest' order by id`,
  );
  return result.rows.map(({ action }) => action);
}

async function countGuests(): Promise<number> {
  const result = await getDatabase().execute<{ total: number }>(
    sql`select count(*)::int as total from guests`,
  );
  return result.rows[0]?.total ?? 0;
}

describe("huéspedes: aceptar una entrevista", () => {
  beforeEach(async () => {
    await resetTestDatabase();
    vi.stubEnv("__NEXT_EXPERIMENTAL_AUTH_INTERRUPTS", "true");
  });

  it("RF-HUE-02, RF-HUE-07: copia identidad, cobertura y dirección, interna hoy y asigna el número siguiente", async () => {
    const actorUserId = await signInAsSuperUser();
    const interviewId = await insertInterviewWithCoverage();

    const result = await acceptAdmissionInterview(actorUserId, interviewId);
    if (result.status !== "success") {
      throw new Error("No se aceptó la entrevista de prueba.");
    }

    const [guest] = await getDatabase()
      .select()
      .from(guests)
      .where(eq(guests.id, result.guestId));
    expect(result).toMatchObject({ clinicalRecordNumber: 1, wasCreated: true });
    expect(guest).toMatchObject({
      firstName: "Persona",
      lastName: "Ficticia",
      birthDate: "1950-01-01",
      dni: "11222333",
      address: "Calle Ficticia 123",
      healthInsuranceOptionId: await findSeededOptionId(
        "health_insurance",
        "OSDE",
      ),
      healthInsuranceMemberNumber: "123456",
      hospitalizationDate: getBusinessDate(new Date()),
      origin: "admission",
      admissionInterviewId: interviewId,
      createdByUserId: actorUserId,
    });
    await expect(listGuestAuditActions()).resolves.toEqual([
      "guest.created_from_admission",
    ]);
  });

  it("CA-08: aceptar de nuevo lleva al mismo huésped sin duplicarlo", async () => {
    const actorUserId = await signInAsSuperUser();
    const interviewId = await insertFictitiousInterviewId();

    const first = await acceptAdmissionInterview(actorUserId, interviewId);
    const second = await acceptAdmissionInterview(actorUserId, interviewId);

    expect(second).toEqual({
      status: "success",
      guestId: first.status === "success" ? first.guestId : "",
      clinicalRecordNumber: 1,
      wasCreated: false,
    });
    await expect(countGuests()).resolves.toBe(1);
  });

  it("CA-08: dos aceptaciones simultáneas crean un solo huésped", async () => {
    const actorUserId = await signInAsSuperUser();
    const interviewId = await insertFictitiousInterviewId();

    const results = await Promise.all([
      acceptAdmissionInterview(actorUserId, interviewId),
      acceptAdmissionInterview(actorUserId, interviewId),
    ]);

    expect(results.map((result) => result.status)).toEqual([
      "success",
      "success",
    ]);
    await expect(countGuests()).resolves.toBe(1);
  });

  it("R-14: con el huésped anterior anulado, crea otro con número nuevo", async () => {
    const actorUserId = await signInAsSuperUser();
    const interviewId = await insertFictitiousInterviewId();
    const first = await acceptAdmissionInterview(actorUserId, interviewId);
    if (first.status !== "success") {
      throw new Error("No se aceptó la entrevista de prueba.");
    }
    await getDatabase()
      .update(guests)
      .set({ annulledAt: new Date(), annulmentReason: "Carga duplicada" })
      .where(eq(guests.id, first.guestId));

    const second = await acceptAdmissionInterview(actorUserId, interviewId);

    expect(second).toMatchObject({
      status: "success",
      clinicalRecordNumber: 2,
      wasCreated: true,
    });
    await expect(findGuestOfInterview(interviewId)).resolves.toMatchObject({
      clinicalRecordNumber: 2,
    });
  });

  it("RF-ENT-06: una entrevista anulada no se puede aceptar", async () => {
    const actorUserId = await signInAsSuperUser();
    const interviewId = await insertFictitiousInterviewId();
    await getDatabase().execute(
      sql`update admission_interviews
          set annulled_at = now(), annulment_reason = 'Carga duplicada de prueba'
          where id = ${interviewId}`,
    );

    await expect(
      acceptAdmissionInterview(actorUserId, interviewId),
    ).resolves.toEqual({
      status: "rejected",
      message: INTERVIEW_ACCEPTANCE_REJECTION_MESSAGES.annulled,
    });
    await expect(countGuests()).resolves.toBe(0);
  });

  it("CA-03, RF-ENT-06: sin permiso de crear huéspedes el servidor rechaza sin crear nada", async () => {
    await signInAsSuperUser();
    const interviewId = await insertFictitiousInterviewId();
    await restrictSignedInUserTo([
      "admissions.interviews.view",
      "guests.records.view",
      "guests.records.manual_create",
    ]);

    await expect(
      acceptAdmissionInterviewAction(interviewId),
    ).rejects.toMatchObject({ digest: FORBIDDEN_DIGEST });
    await expect(countGuests()).resolves.toBe(0);
  });

  it("RF-HUE-03: el alta manual avisa una entrevista vigente sin aceptar con el mismo DNI y enlaza a ella", async () => {
    const actorUserId = await signInAsSuperUser();
    const interviewId = await insertFictitiousInterviewId();

    await expect(checkGuestDniAction("11.222.333")).resolves.toEqual({
      hasActiveGuest: false,
      hasPendingInterview: true,
      pendingInterviewHref: `/admisiones/${interviewId}`,
    });

    await acceptAdmissionInterview(actorUserId, interviewId);

    await expect(checkGuestDniAction("11.222.333")).resolves.toEqual({
      hasActiveGuest: true,
      hasPendingInterview: false,
      pendingInterviewHref: null,
    });
  });

  it("RF-HUE-03: con varias entrevistas pendientes, el enlace lleva a Admisiones filtrado por DNI; sin permiso de verlas, no hay enlace", async () => {
    await signInAsSuperUser();
    await insertFictitiousInterviewId();
    await insertFictitiousInterviewId();

    await expect(checkGuestDniAction("11.222.333")).resolves.toMatchObject({
      hasPendingInterview: true,
      pendingInterviewHref: "/admisiones?buscar=11222333",
    });

    await restrictSignedInUserTo(["guests.records.manual_create"]);

    await expect(checkGuestDniAction("11.222.333")).resolves.toMatchObject({
      hasPendingInterview: true,
      pendingInterviewHref: null,
    });
  });
});
