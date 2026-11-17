// @vitest-environment node

import { sql } from "drizzle-orm";
import { z } from "zod";
import { beforeEach, describe, expect, it } from "vitest";

import { getDatabase } from "@/platform/database/client";
import { resetTestDatabase } from "@/platform/database/test-database";

import { annulmentSchema, DEFAULT_ADMISSION_INTERVIEW_SORT } from "./schemas";
import {
  ADMISSION_INTERVIEW_REJECTION_MESSAGES,
  annulAdmissionInterview,
  createAdmissionInterview,
  findAdmissionInterview,
  searchAdmissionInterviews,
} from "./service";
import {
  buildValidInput,
  createActorUserId,
  parseDetails,
} from "./test-fixtures";

const VALID_REASON = "Carga duplicada por error";

async function createInterview(actorUserId: string): Promise<string> {
  const result = await createAdmissionInterview(
    actorUserId,
    parseDetails(await buildValidInput()),
  );
  if (result.status !== "success") {
    throw new Error("No se creó la entrevista de prueba.");
  }
  return result.interviewId;
}

function reasonErrors(reason: string): string[] | undefined {
  const result = annulmentSchema.safeParse({ reason });
  return result.success
    ? undefined
    : z.flattenError(result.error).fieldErrors.reason;
}

describe("admisiones: anulación", () => {
  beforeEach(async () => {
    await resetTestDatabase();
  });

  it("RF-ENT-05: el motivo tiene de 10 a 500 caracteres, sin contar espacios de los extremos", () => {
    expect(reasonErrors("  123456789  ")).toEqual([
      "El motivo debe tener al menos 10 caracteres.",
    ]);
    expect(reasonErrors("a".repeat(501))).toEqual([
      "El motivo no puede superar los 500 caracteres.",
    ]);
    expect(reasonErrors("1234567890")).toBeUndefined();
    expect(reasonErrors("a".repeat(500))).toBeUndefined();
  });

  it("RF-ENT-05, RN-04, RN-20: anula sin borrar, guarda quién, cuándo y por qué, y lo registra", async () => {
    const actorUserId = await createActorUserId();
    const interviewId = await createInterview(actorUserId);

    const result = await annulAdmissionInterview(
      actorUserId,
      interviewId,
      VALID_REASON,
    );

    expect(result).toEqual({ status: "success" });
    const view = await findAdmissionInterview(interviewId);
    expect(view?.isAnnulled).toBe(true);
    expect(view?.annulment).toMatchObject({
      annulledByName: "Ana Prueba",
      reason: VALID_REASON,
    });
    const auditEntries = await getDatabase().execute<{
      action: string;
      operation: string;
      actor_user_id: string;
      reason: string;
    }>(
      sql`select action, operation, actor_user_id, new_value->>'annulment_reason' as reason
          from audit_log
          where resource_id = ${interviewId} and action = 'admission_interview.annulled'`,
    );
    expect(auditEntries.rows).toEqual([
      {
        action: "admission_interview.annulled",
        operation: "delete",
        actor_user_id: actorUserId,
        reason: VALID_REASON,
      },
    ]);
  });

  it("8.2: la entrevista anulada sale del listado", async () => {
    const actorUserId = await createActorUserId();
    const interviewId = await createInterview(actorUserId);

    await annulAdmissionInterview(actorUserId, interviewId, VALID_REASON);
    const { page } = await searchAdmissionInterviews({
      search: "",
      sort: DEFAULT_ADMISSION_INTERVIEW_SORT,
      page: 1,
      pageSize: 50,
      relationshipOptionId: null,
      primaryDoctorId: null,
    });

    expect(page.items).toEqual([]);
  });

  it("RF-ENT-05: no se puede anular dos veces ni anular una entrevista inexistente", async () => {
    const actorUserId = await createActorUserId();
    const interviewId = await createInterview(actorUserId);
    await annulAdmissionInterview(actorUserId, interviewId, VALID_REASON);

    expect(
      await annulAdmissionInterview(actorUserId, interviewId, VALID_REASON),
    ).toEqual({
      status: "rejected",
      message: ADMISSION_INTERVIEW_REJECTION_MESSAGES.alreadyAnnulled,
    });
    expect(
      await annulAdmissionInterview(
        actorUserId,
        "00000000-0000-4000-8000-000000000000",
        VALID_REASON,
      ),
    ).toEqual({
      status: "rejected",
      message: ADMISSION_INTERVIEW_REJECTION_MESSAGES.notFound,
    });
  });
});
