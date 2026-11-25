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

import { updateGuestAction } from "./actions";
import {
  buildEmptyGuest,
  type GuestDetailsInput,
  guestDetailsSchema,
} from "./schemas";
import {
  createGuestManually,
  findGuestToEdit,
  GUEST_REJECTION_MESSAGES,
  updateGuest,
} from "./service";
import { guests } from "./tables";
import { findSeededOptionId } from "./test-fixtures";

vi.mock("next/headers", async () => {
  const session = await import("@/testing/action-session");
  return { headers: async () => session.testRequestHeaders.current };
});
vi.mock("next/cache", () => ({ refresh: vi.fn() }));

function buildInput(
  overrides: Partial<GuestDetailsInput> = {},
): GuestDetailsInput {
  return {
    ...buildEmptyGuest("2026-11-20"),
    firstName: "Persona",
    lastName: "Ficticia",
    birthDate: "1950-01-01",
    dni: "11.222.333",
    address: "Calle Ficticia 123",
    ...overrides,
  };
}

async function createGuest(
  actorUserId: string,
  overrides: Partial<GuestDetailsInput> = {},
): Promise<string> {
  const result = await createGuestManually(
    actorUserId,
    guestDetailsSchema.parse(buildInput(overrides)),
  );
  if (result.status !== "success") {
    throw new Error("No se creó el huésped de prueba.");
  }
  return result.guestId;
}

async function loadForEdit(guestId: string) {
  const guest = await findGuestToEdit(guestId);
  if (!guest) {
    throw new Error("No se encontró el huésped de prueba.");
  }
  return guest;
}

type AuditEntry = {
  action: string;
  previous_value: Record<string, unknown> | null;
  new_value: Record<string, unknown> | null;
};

async function listAuditEntries(guestId: string): Promise<AuditEntry[]> {
  const result = await getDatabase().execute<AuditEntry>(
    sql`select action, previous_value, new_value from audit_log
        where resource_id = ${guestId} order by id`,
  );
  return result.rows;
}

describe("huéspedes: edición", () => {
  beforeEach(async () => {
    await resetTestDatabase();
    vi.stubEnv("__NEXT_EXPERIMENTAL_AUTH_INTERRUPTS", "true");
  });

  it("RF-HUE-05, R-02, RN-20: guarda los cambios con el valor anterior y el nuevo, sin cambiar el número", async () => {
    const actorUserId = await signInAsSuperUser();
    const reasonOptionId = await findSeededOptionId(
      "hospitalization_reason",
      "Desgaste del cuidador principal",
    );
    const symptomOptionId = await findSeededOptionId(
      "uncontrolled_symptom",
      "Dolor",
    );
    const guestId = await createGuest(actorUserId, {
      hospitalizationReasonOptionIds: [reasonOptionId],
    });
    const { version } = await loadForEdit(guestId);

    await expect(
      updateGuest(
        actorUserId,
        guestId,
        version,
        guestDetailsSchema.parse(
          buildInput({
            address: "Otra Calle Ficticia 456",
            hospitalizationDate: "2026-11-18",
            uncontrolledSymptomOptionIds: [symptomOptionId],
          }),
        ),
      ),
    ).resolves.toEqual({ status: "success" });

    const [guest] = await getDatabase()
      .select()
      .from(guests)
      .where(eq(guests.id, guestId));
    expect(guest).toMatchObject({
      clinicalRecordNumber: 1,
      address: "Otra Calle Ficticia 456",
      hospitalizationDate: "2026-11-18",
      origin: "manual",
    });
    const entries = await listAuditEntries(guestId);
    const updated = entries.find((entry) => entry.action === "guest.updated");
    expect(updated?.previous_value?.address).toBe("Calle Ficticia 123");
    expect(updated?.new_value?.address).toBe("Otra Calle Ficticia 456");
    expect(entries.map((entry) => entry.action)).toEqual(
      expect.arrayContaining([
        "guest_hospitalization_reason.deleted",
        "guest_uncontrolled_symptom.created",
      ]),
    );
  });

  it("RF-HUE-05: rechaza el cambio si otra persona modificó al huésped mientras tanto", async () => {
    const actorUserId = await signInAsSuperUser();
    const guestId = await createGuest(actorUserId);
    const { version } = await loadForEdit(guestId);
    await updateGuest(
      actorUserId,
      guestId,
      version,
      guestDetailsSchema.parse(buildInput({ address: "Primera edición 1" })),
    );

    await expect(
      updateGuest(
        actorUserId,
        guestId,
        version,
        guestDetailsSchema.parse(buildInput({ address: "Segunda edición 2" })),
      ),
    ).resolves.toEqual({
      status: "rejected",
      message: GUEST_REJECTION_MESSAGES.changedMeanwhile,
    });
  });

  it("RN-04: un huésped anulado no se puede editar", async () => {
    const actorUserId = await signInAsSuperUser();
    const guestId = await createGuest(actorUserId);
    await getDatabase()
      .update(guests)
      .set({ annulledAt: new Date(), annulmentReason: "Carga duplicada" })
      .where(eq(guests.id, guestId));
    const { version } = await loadForEdit(guestId);

    await expect(
      updateGuest(
        actorUserId,
        guestId,
        version,
        guestDetailsSchema.parse(buildInput()),
      ),
    ).resolves.toEqual({
      status: "rejected",
      message: GUEST_REJECTION_MESSAGES.annulled,
    });
  });

  it("RF-CAT-02, RF-CAT-07: conserva una opción desactivada ya elegida y rechaza una desactivada nueva", async () => {
    const actorUserId = await signInAsSuperUser();
    const keptOptionId = await findSeededOptionId(
      "uncontrolled_symptom",
      "Dolor",
    );
    const newOptionId = await findSeededOptionId(
      "uncontrolled_symptom",
      "Disnea",
    );
    const guestId = await createGuest(actorUserId, {
      uncontrolledSymptomOptionIds: [keptOptionId],
    });
    await getDatabase().execute(
      sql`update catalog_options set is_active = false
          where id in (${keptOptionId}, ${newOptionId})`,
    );
    const { version } = await loadForEdit(guestId);

    await expect(
      updateGuest(
        actorUserId,
        guestId,
        version,
        guestDetailsSchema.parse(
          buildInput({ uncontrolledSymptomOptionIds: [keptOptionId] }),
        ),
      ),
    ).resolves.toEqual({ status: "success" });

    const { version: nextVersion } = await loadForEdit(guestId);
    await expect(
      updateGuest(
        actorUserId,
        guestId,
        nextVersion,
        guestDetailsSchema.parse(
          buildInput({
            uncontrolledSymptomOptionIds: [keptOptionId, newOptionId],
          }),
        ),
      ),
    ).resolves.toMatchObject({
      status: "invalid",
      fieldErrors: { uncontrolledSymptomOptionIds: [expect.any(String)] },
    });
  });

  it("RN-02: la acción rechaza una fecha de internación futura junto al campo", async () => {
    const actorUserId = await signInAsSuperUser();
    const guestId = await createGuest(actorUserId);
    const { version } = await loadForEdit(guestId);

    await expect(
      updateGuestAction(
        guestId,
        version,
        buildInput({ hospitalizationDate: "2999-01-01" }),
      ),
    ).resolves.toMatchObject({
      status: "invalid",
      fieldErrors: { hospitalizationDate: [expect.any(String)] },
    });
  });

  it("CA-03, RF-ROL-08: sin permiso de modificar huéspedes el servidor rechaza sin cambiar nada", async () => {
    const actorUserId = await signInAsSuperUser();
    const guestId = await createGuest(actorUserId);
    const { version } = await loadForEdit(guestId);
    await restrictSignedInUserTo([
      "guests.records.view",
      "guests.records.manual_create",
    ]);

    await expect(
      updateGuestAction(
        guestId,
        version,
        buildInput({ address: "Cambio sin permiso 1" }),
      ),
    ).rejects.toMatchObject({ digest: FORBIDDEN_DIGEST });
    const [guest] = await getDatabase()
      .select({ address: guests.address })
      .from(guests)
      .where(eq(guests.id, guestId));
    expect(guest?.address).toBe("Calle Ficticia 123");
  });
});
