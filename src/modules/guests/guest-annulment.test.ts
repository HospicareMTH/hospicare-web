// @vitest-environment node

import { eq, sql } from "drizzle-orm";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { getDatabase } from "@/platform/database/client";
import { resetTestDatabase } from "@/platform/database/test-database";
import {
  FORBIDDEN_DIGEST,
  restrictSignedInUserTo,
  signInAsSuperUser,
} from "@/testing/action-session";

import { annulGuestAction } from "./actions";
import {
  buildEmptyGuest,
  DEFAULT_GUEST_SORT,
  guestDetailsSchema,
} from "./schemas";
import {
  acceptAdmissionInterview,
  annulGuest,
  createGuestManually,
  findAnnulledGuestOfInterview,
  findGuest,
  findGuestOfInterview,
  findGuestToEdit,
  GUEST_REJECTION_MESSAGES,
  searchGuests,
  updateGuest,
} from "./service";
import { guests } from "./tables";
import { insertFictitiousInterviewId } from "./test-fixtures";

vi.mock("next/headers", async () => {
  const session = await import("@/testing/action-session");
  return { headers: async () => session.testRequestHeaders.current };
});
vi.mock("next/cache", () => ({ refresh: vi.fn() }));

const VALID_REASON = "Carga duplicada por error";

async function createGuest(actorUserId: string): Promise<string> {
  const result = await createGuestManually(
    actorUserId,
    guestDetailsSchema.parse({
      ...buildEmptyGuest("2026-11-20"),
      firstName: "Persona",
      lastName: "Ficticia",
      birthDate: "1950-01-01",
      dni: "11.222.333",
      address: "Calle Ficticia 123",
    }),
  );
  if (result.status !== "success") {
    throw new Error("No se creó el huésped de prueba.");
  }
  return result.guestId;
}

async function acceptInterview(
  actorUserId: string,
  interviewId: string,
): Promise<{ guestId: string; clinicalRecordNumber: number }> {
  const result = await acceptAdmissionInterview(actorUserId, interviewId);
  if (result.status !== "success") {
    throw new Error("No se aceptó la entrevista de prueba.");
  }
  return result;
}

function searchAllGuests() {
  return searchGuests({
    search: "",
    sort: DEFAULT_GUEST_SORT,
    page: 1,
    pageSize: 50,
    origin: null,
  });
}

describe("huéspedes: anulación", () => {
  beforeEach(async () => {
    await resetTestDatabase();
    vi.stubEnv("__NEXT_EXPERIMENTAL_AUTH_INTERRUPTS", "true");
  });

  it("RF-HUE-06, RN-04, RN-20: anula sin borrar, guarda quién, cuándo y por qué, y lo registra como baja", async () => {
    const actorUserId = await signInAsSuperUser();
    const guestId = await createGuest(actorUserId);

    const result = await annulGuestAction(guestId, { reason: VALID_REASON });

    expect(result).toEqual({ status: "success" });
    const view = await findGuest(guestId);
    expect(view?.annulment).toMatchObject({ reason: VALID_REASON });
    expect(view?.annulment?.annulledByName).not.toBeNull();
    const auditEntries = await getDatabase().execute<{
      operation: string;
      actor_user_id: string;
      previous_reason: string | null;
      new_reason: string;
    }>(
      sql`select operation, actor_user_id,
                 previous_value->>'annulment_reason' as previous_reason,
                 new_value->>'annulment_reason' as new_reason
          from audit_log
          where resource_id = ${guestId} and action = 'guest.annulled'`,
    );
    expect(auditEntries.rows).toEqual([
      {
        operation: "delete",
        actor_user_id: actorUserId,
        previous_reason: null,
        new_reason: VALID_REASON,
      },
    ]);
  });

  it("RF-HUE-06, R-20: la acción rechaza un motivo de menos de 10 caracteres junto al campo, sin anular", async () => {
    const guestId = await createGuest(await signInAsSuperUser());

    const result = await annulGuestAction(guestId, { reason: "  corto  " });

    expect(result).toEqual({
      status: "invalid",
      fieldErrors: { reason: ["El motivo debe tener al menos 10 caracteres."] },
    });
    await expect(findGuest(guestId)).resolves.toMatchObject({
      annulment: null,
    });
  });

  it("RF-HUE-01, 8.2: el huésped anulado sale del listado", async () => {
    const actorUserId = await signInAsSuperUser();
    const guestId = await createGuest(actorUserId);

    await annulGuest(actorUserId, guestId, VALID_REASON);

    const page = await searchAllGuests();
    expect(page.items).toEqual([]);
  });

  it("RF-HUE-06: no se puede anular dos veces ni anular un huésped inexistente", async () => {
    const actorUserId = await signInAsSuperUser();
    const guestId = await createGuest(actorUserId);
    await annulGuest(actorUserId, guestId, VALID_REASON);

    await expect(
      annulGuest(actorUserId, guestId, "Otro motivo distinto"),
    ).resolves.toEqual({
      status: "rejected",
      message: GUEST_REJECTION_MESSAGES.alreadyAnnulled,
    });
    await expect(
      annulGuest(actorUserId, crypto.randomUUID(), VALID_REASON),
    ).resolves.toEqual({
      status: "rejected",
      message: GUEST_REJECTION_MESSAGES.notFound,
    });
    const [guest] = await getDatabase()
      .select({ annulmentReason: guests.annulmentReason })
      .from(guests)
      .where(eq(guests.id, guestId));
    expect(guest?.annulmentReason).toBe(VALID_REASON);
  });

  it("RN-04: después de anularlo, el huésped ya no se puede editar", async () => {
    const actorUserId = await signInAsSuperUser();
    const guestId = await createGuest(actorUserId);
    const guestToEdit = await findGuestToEdit(guestId);
    if (!guestToEdit) {
      throw new Error("No se encontró el huésped de prueba.");
    }
    await annulGuest(actorUserId, guestId, VALID_REASON);

    await expect(
      updateGuest(
        actorUserId,
        guestId,
        guestToEdit.version,
        guestDetailsSchema.parse({
          ...guestToEdit.details,
          address: "Otra dirección ficticia",
        }),
      ),
    ).resolves.toEqual({
      status: "rejected",
      message: GUEST_REJECTION_MESSAGES.annulled,
    });
  });

  it("RF-HUE-07: el número de un huésped anulado no se vuelve a usar", async () => {
    const actorUserId = await signInAsSuperUser();
    const annulledGuestId = await createGuest(actorUserId);
    await annulGuest(actorUserId, annulledGuestId, VALID_REASON);

    const nextGuestId = await createGuest(actorUserId);

    await expect(findGuest(annulledGuestId)).resolves.toMatchObject({
      clinicalRecordNumber: 1,
    });
    await expect(findGuest(nextGuestId)).resolves.toMatchObject({
      clinicalRecordNumber: 2,
    });
  });

  it("RF-HUE-02, R-14: la entrevista del huésped anulado deja de estar aceptada y muestra el huésped anulado", async () => {
    const actorUserId = await signInAsSuperUser();
    const interviewId = await insertFictitiousInterviewId();
    const accepted = await acceptInterview(actorUserId, interviewId);

    await annulGuest(actorUserId, accepted.guestId, VALID_REASON);

    await expect(findGuestOfInterview(interviewId)).resolves.toBeNull();
    await expect(
      findAnnulledGuestOfInterview(interviewId),
    ).resolves.toMatchObject({
      guestId: accepted.guestId,
      clinicalRecordNumber: accepted.clinicalRecordNumber,
    });
  });

  it("RF-HUE-02: con dos huéspedes anulados, la entrevista muestra el último anulado", async () => {
    const actorUserId = await signInAsSuperUser();
    const interviewId = await insertFictitiousInterviewId();
    const first = await acceptInterview(actorUserId, interviewId);
    await annulGuest(actorUserId, first.guestId, VALID_REASON);
    const second = await acceptInterview(actorUserId, interviewId);
    await annulGuest(actorUserId, second.guestId, VALID_REASON);

    await expect(
      findAnnulledGuestOfInterview(interviewId),
    ).resolves.toMatchObject({ guestId: second.guestId });
  });

  it("CA-03, RF-ROL-08: sin permiso de anular huéspedes el servidor rechaza sin anular", async () => {
    const actorUserId = await signInAsSuperUser();
    const guestId = await createGuest(actorUserId);
    await restrictSignedInUserTo([
      "guests.records.view",
      "guests.records.update",
    ]);

    await expect(
      annulGuestAction(guestId, { reason: VALID_REASON }),
    ).rejects.toMatchObject({ digest: FORBIDDEN_DIGEST });
    await expect(findGuest(guestId)).resolves.toMatchObject({
      annulment: null,
    });
  });
});
