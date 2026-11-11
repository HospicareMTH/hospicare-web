// @vitest-environment node

import { sql } from "drizzle-orm";
import { beforeEach, describe, expect, it } from "vitest";

import { getDatabase } from "@/platform/database/client";
import { resetTestDatabase } from "@/platform/database/test-database";

import { getAuth } from "../auth/auth";
import {
  changeUserRole,
  createUser,
  revokeUserAccess,
  USER_REJECTION_MESSAGES,
} from "./service";
import { createInvitation } from "../invitations/service";
import { getAdminSummary } from "../administration/service";
import { getUserAccess, type UserAccess } from "../authorization/service";
import {
  createRoleWithPermissions,
  createSuperUserAccess,
  createUserWithRole,
  findRoleId,
  findUserId,
} from "../test-fixtures";

const STAFF_EMAIL = "lorena.ficticia@hospicare.test";
const NEW_PERSON = {
  name: "Pablo Ficticio",
  email: "pablo.ficticio@hospicare.test",
  password: "clave-inicial-de-prueba",
  passwordConfirmation: "clave-inicial-de-prueba",
  isEmailVerified: false,
};

function getBaseUrl(): string {
  const baseUrl = process.env.BETTER_AUTH_URL;
  if (!baseUrl) {
    throw new Error("Falta BETTER_AUTH_URL en .env.test.local.");
  }
  return baseUrl;
}

function postToAuth(path: string, body: object, cookie = "") {
  return getAuth().handler(
    new Request(`${getBaseUrl()}/api/auth${path}`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        origin: getBaseUrl(),
        "cf-connecting-ip": "203.0.113.70",
        cookie,
      },
      body: JSON.stringify(body),
    }),
  );
}

async function countAuditEntries(action: string): Promise<number> {
  const result = await getDatabase().execute<{ count: string }>(
    sql`select count(*) as count from audit_log where action = ${action}`,
  );
  return Number(result.rows[0]?.count);
}

describe("administración de usuarios", () => {
  let superUser: UserAccess;
  let userRoleId: string;

  beforeEach(async () => {
    await resetTestDatabase();
    superUser = await createSuperUserAccess();
    userRoleId = await findRoleId("Usuario");
  });

  it("RF-USR-02, RN-20: crea un usuario que puede entrar y lo registra", async () => {
    const result = await createUser(superUser, {
      ...NEW_PERSON,
      roleId: userRoleId,
      isEmailVerified: true,
    });

    expect(result).toEqual({ status: "success" });
    const userId = await findUserId(NEW_PERSON.email);
    const created = await getDatabase().execute<{
      email_verified: boolean;
      actor_user_id: string | null;
    }>(sql`
      select users.email_verified, audit_log.actor_user_id
      from users join audit_log
        on audit_log.action = 'user.created' and audit_log.resource_id = users.id
      where users.id = ${userId}
    `);
    expect(created.rows).toEqual([
      { email_verified: true, actor_user_id: superUser.userId },
    ]);
    const response = await postToAuth("/sign-in/email", {
      email: NEW_PERSON.email,
      password: NEW_PERSON.password,
    });
    expect(response.status).toBe(200);
  });

  it("RF-USR-02: rechaza un correo con cuenta o con invitación pendiente", async () => {
    await createUserWithRole(STAFF_EMAIL, userRoleId);
    await createInvitation(superUser, {
      name: "Carla Ficticia",
      email: "carla.ficticia@hospicare.test",
      roleId: userRoleId,
    });

    const registered = await createUser(superUser, {
      ...NEW_PERSON,
      email: STAFF_EMAIL,
      roleId: userRoleId,
    });
    const invited = await createUser(superUser, {
      ...NEW_PERSON,
      email: "carla.ficticia@hospicare.test",
      roleId: userRoleId,
    });

    expect(registered).toEqual({
      status: "rejected",
      message: USER_REJECTION_MESSAGES.emailRegistered,
    });
    expect(invited).toEqual({
      status: "rejected",
      message: USER_REJECTION_MESSAGES.invitationPending,
    });
  });

  it("R-01: no crea usuarios con un rol de más permisos que los propios", async () => {
    const managerRoleId = await createRoleWithPermissions(
      superUser,
      "Coordinación",
      ["admin.users.view", "admin.users.create"],
    );
    const manager = await createUserWithRole(STAFF_EMAIL, managerRoleId);

    const asSuperUser = await createUser(manager, {
      ...NEW_PERSON,
      roleId: await findRoleId("Super user"),
    });
    const asWiderRole = await createUser(manager, {
      ...NEW_PERSON,
      roleId: await createRoleWithPermissions(superUser, "Amplio", [
        "admin.roles.view",
      ]),
    });

    expect(asSuperUser).toEqual({
      status: "rejected",
      message: USER_REJECTION_MESSAGES.superUserRoleOnly,
    });
    expect(asWiderRole).toEqual({
      status: "rejected",
      message: USER_REJECTION_MESSAGES.roleNotAllowed,
    });
  });

  it("RF-USR-03, CA-04, RN-20: cambia el rol y rige en la próxima operación", async () => {
    const staff = await createUserWithRole(STAFF_EMAIL, userRoleId);
    const adminRoleId = await createRoleWithPermissions(
      superUser,
      "Administración",
      ["admin.roles.view"],
    );

    const result = await changeUserRole(superUser, staff.userId, adminRoleId);

    expect(result).toEqual({ status: "success" });
    const access = await getUserAccess(staff.userId);
    expect(access.permissions.has("admin.roles.view")).toBe(true);
    expect(await countAuditEntries("user_role.updated")).toBe(1);
  });

  it("RF-USR-03: nadie cambia su propio rol, ni el Super user se lo quita", async () => {
    const result = await changeUserRole(
      superUser,
      superUser.userId,
      userRoleId,
    );

    expect(result).toEqual({
      status: "rejected",
      message: USER_REJECTION_MESSAGES.ownRole,
    });
    expect((await getUserAccess(superUser.userId)).isSuperUser).toBe(true);
  });

  it("R-01: solo un Super user cambia el rol de otro Super user", async () => {
    const managerRoleId = await createRoleWithPermissions(
      superUser,
      "Coordinación",
      ["admin.users.view", "admin.users.update"],
    );
    const manager = await createUserWithRole(STAFF_EMAIL, managerRoleId);

    const result = await changeUserRole(
      manager,
      superUser.userId,
      managerRoleId,
    );

    expect(result).toEqual({
      status: "rejected",
      message: USER_REJECTION_MESSAGES.superUserOnly,
    });
  });

  it("RF-ADM-01: resume roles, usuarios, activos e invitaciones pendientes", async () => {
    const staff = await createUserWithRole(STAFF_EMAIL, userRoleId);
    await revokeUserAccess(superUser, staff.userId, {
      duration: { kind: "permanent" },
      reason: "Prueba de revocación",
    });
    await createInvitation(superUser, {
      name: "Carla Ficticia",
      email: "carla.ficticia@hospicare.test",
      roleId: userRoleId,
    });

    expect(await getAdminSummary(superUser)).toEqual({
      roleCount: 2,
      userCount: 2,
      activeUserCount: 1,
      pendingInvitationCount: 1,
    });
  });

  it("RF-ADM-01, RF-ROL-09: no calcula los totales que el rol no puede ver", async () => {
    const viewerRoleId = await createRoleWithPermissions(
      superUser,
      "Solo invitaciones",
      ["admin.invitations.view"],
    );
    const viewer = await createUserWithRole(STAFF_EMAIL, viewerRoleId);

    expect(await getAdminSummary(viewer)).toEqual({
      roleCount: null,
      userCount: null,
      activeUserCount: null,
      pendingInvitationCount: 0,
    });
  });
});
