// @vitest-environment node
import { sql } from "drizzle-orm";
import { beforeEach, describe, expect, it } from "vitest";

import { getDatabase } from "@/platform/database/client";
import { resetTestDatabase } from "@/platform/database/test-database";

import { getAuth } from "./auth";
import {
  ACCESS_REVOKED_ERROR_CODE,
  accessRevocationSchema,
  DEFAULT_USER_SORT,
} from "./schemas";
import {
  ACCESS_REJECTION_MESSAGES,
  restoreUserAccess,
  revokeUserAccess,
  searchUsers,
  type UserAccess,
} from "./service";
import {
  createRoleWithPermissions,
  createSuperUserAccess,
  createUserWithRole,
  FICTITIOUS_PASSWORD,
  FICTITIOUS_SUPER_USER,
  findRoleId,
} from "./test-fixtures";

const STAFF_EMAIL = "enfermeria@hospicare.test";
const REASON = "Licencia prolongada";

function signIn(email: string) {
  return getAuth().api.signInEmail({
    body: { email, password: FICTITIOUS_PASSWORD },
  });
}

async function countSessions(userId: string): Promise<number> {
  const result = await getDatabase().execute<{ total: number }>(
    sql`select count(*)::int as total from sessions where user_id = ${userId}`,
  );
  return result.rows[0]?.total ?? 0;
}

describe("revocación de accesos", () => {
  let superUser: UserAccess;
  let staff: UserAccess;

  beforeEach(async () => {
    await resetTestDatabase();
    superUser = await createSuperUserAccess();
    staff = await createUserWithRole(STAFF_EMAIL, await findRoleId("Usuario"));
  });

  it("RF-USR-04, RF-ACC-18: revocar cierra sus sesiones y le impide volver a entrar", async () => {
    await signIn(STAFF_EMAIL);
    expect(await countSessions(staff.userId)).toBe(1);

    await expect(
      revokeUserAccess(superUser, staff.userId, {
        duration: { kind: "permanent" },
        reason: REASON,
      }),
    ).resolves.toEqual({ status: "success" });

    expect(await countSessions(staff.userId)).toBe(0);
    await expect(signIn(STAFF_EMAIL)).rejects.toMatchObject({
      body: { code: ACCESS_REVOKED_ERROR_CODE },
    });
  });

  it("RF-USR-04: la revocación temporal vence sola", async () => {
    await revokeUserAccess(superUser, staff.userId, {
      duration: { kind: "temporary", days: 3 },
      reason: REASON,
    });
    await expect(signIn(STAFF_EMAIL)).rejects.toMatchObject({
      body: { code: ACCESS_REVOKED_ERROR_CODE },
    });

    await getDatabase().execute(
      sql`update users set access_revoked_until = now() - interval '1 minute' where id = ${staff.userId}`,
    );
    await expect(signIn(STAFF_EMAIL)).resolves.toMatchObject({
      user: { email: STAFF_EMAIL },
    });
  });

  it("RF-USR-04: valida días de 1 a 365 y un motivo de 5 a 500 caracteres", () => {
    const invalidRevocations = [
      { duration: { kind: "temporary", days: 0 }, reason: REASON },
      { duration: { kind: "temporary", days: 366 }, reason: REASON },
      { duration: { kind: "permanent" }, reason: "Baja" },
      { duration: { kind: "permanent" }, reason: "x".repeat(501) },
    ];
    for (const revocation of invalidRevocations) {
      expect(accessRevocationSchema.safeParse(revocation).success).toBe(false);
    }
    expect(
      accessRevocationSchema.safeParse({
        duration: { kind: "temporary", days: "365" },
        reason: REASON,
      }).success,
    ).toBe(true);
  });

  it("RF-USR-04, R-01: nadie revoca su propia cuenta ni la de un Super user sin serlo", async () => {
    await expect(
      revokeUserAccess(superUser, superUser.userId, {
        duration: { kind: "permanent" },
        reason: REASON,
      }),
    ).resolves.toEqual({
      status: "rejected",
      message: ACCESS_REJECTION_MESSAGES.ownAccount,
    });

    const managerRoleId = await createRoleWithPermissions(
      superUser,
      "Coordinación",
      ["admin.users.revoke"],
    );
    const manager = await createUserWithRole(
      "coordinacion@hospicare.test",
      managerRoleId,
    );
    await expect(
      revokeUserAccess(manager, superUser.userId, {
        duration: { kind: "permanent" },
        reason: REASON,
      }),
    ).resolves.toEqual({
      status: "rejected",
      message: ACCESS_REJECTION_MESSAGES.superUserOnly,
    });
    await expect(
      revokeUserAccess(manager, staff.userId, {
        duration: { kind: "permanent" },
        reason: REASON,
      }),
    ).resolves.toEqual({ status: "success" });
  });

  it("RF-USR-05: restaurar devuelve el acceso", async () => {
    await revokeUserAccess(superUser, staff.userId, {
      duration: { kind: "permanent" },
      reason: REASON,
    });

    await expect(restoreUserAccess(superUser, staff.userId)).resolves.toEqual({
      status: "success",
    });
    await expect(restoreUserAccess(superUser, staff.userId)).resolves.toEqual({
      status: "rejected",
      message: ACCESS_REJECTION_MESSAGES.notRevoked,
    });
    await expect(signIn(STAFF_EMAIL)).resolves.toMatchObject({
      user: { email: STAFF_EMAIL },
    });
  });

  it("RF-USR-01: el listado muestra rol y estado de acceso", async () => {
    await revokeUserAccess(superUser, staff.userId, {
      duration: { kind: "permanent" },
      reason: REASON,
    });

    const page = await searchUsers({
      search: "",
      sort: DEFAULT_USER_SORT,
      page: 1,
    });
    expect(
      page.items.map(
        ({ email, roleName, isRevoked, accessRevocationReason }) => ({
          email,
          roleName,
          isRevoked,
          accessRevocationReason,
        }),
      ),
    ).toEqual([
      {
        email: FICTITIOUS_SUPER_USER.email,
        roleName: "Super user",
        isRevoked: false,
        accessRevocationReason: null,
      },
      {
        email: STAFF_EMAIL,
        roleName: "Usuario",
        isRevoked: true,
        accessRevocationReason: REASON,
      },
    ]);
  });

  it("RN-20: revocar y restaurar quedan en el registro de actividad con su responsable", async () => {
    await revokeUserAccess(superUser, staff.userId, {
      duration: { kind: "permanent" },
      reason: REASON,
    });
    await restoreUserAccess(superUser, staff.userId);

    const result = await getDatabase().execute<{
      action: string;
      actor_user_id: string | null;
      revoked_reason: string | null;
    }>(sql`
      select action, actor_user_id, new_value ->> 'access_revocation_reason' as revoked_reason
      from audit_log where resource = 'user' and target_user_id = ${staff.userId} and action = 'user.updated'
      order by id
    `);
    expect(result.rows).toEqual([
      {
        action: "user.updated",
        actor_user_id: superUser.userId,
        revoked_reason: REASON,
      },
      {
        action: "user.updated",
        actor_user_id: superUser.userId,
        revoked_reason: null,
      },
    ]);
  });
});
