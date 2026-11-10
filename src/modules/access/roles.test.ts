// @vitest-environment node
import { sql } from "drizzle-orm";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { getDatabase } from "@/platform/database/client";
import { resetTestDatabase } from "@/platform/database/test-database";

import {
  assignRolePermissionsAction,
  createRoleAction,
  deleteRoleAction,
} from "./actions";
import { getAuth } from "./auth";
import { roleDetailsSchema } from "./schemas";
import {
  assignRolePermissions,
  createFirstSuperUser,
  createRole,
  deleteRole,
  getUserAccess,
  listRoles,
  ROLE_REJECTION_MESSAGES,
  updateRole,
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

const requestHeaders = vi.hoisted(() => ({ current: new Headers() }));

vi.mock("next/headers", () => ({
  headers: async () => requestHeaders.current,
}));
vi.mock("next/cache", () => ({ refresh: vi.fn() }));

const FORBIDDEN_DIGEST = "NEXT_HTTP_ERROR_FALLBACK;403";

async function countRoles(): Promise<number> {
  return (await listRoles()).length;
}

describe("roles y permisos", () => {
  let superUser: UserAccess;

  beforeEach(async () => {
    await resetTestDatabase();
    superUser = await createSuperUserAccess();
  });

  it("RF-ROL-01: los roles de sistema existen y no se pueden eliminar", async () => {
    const roles = await listRoles();
    const systemRoles = roles.filter((role) => role.isSystemRole);
    expect(systemRoles.map((role) => role.name).sort()).toEqual([
      "Super user",
      "Usuario",
    ]);

    for (const role of systemRoles) {
      await expect(deleteRole(superUser, role.id)).resolves.toEqual({
        status: "rejected",
        message: ROLE_REJECTION_MESSAGES.systemRoleLocked,
      });
    }
    expect(await countRoles()).toBe(2);
  });

  it("RF-ROL-02: Super user tiene todos los permisos y no se pueden cambiar", async () => {
    expect(superUser.isSuperUser).toBe(true);
    expect(superUser.permissions.has("admin.roles.delete")).toBe(true);

    const superUserRoleId = await findRoleId("Super user");
    await expect(
      assignRolePermissions(superUser, superUserRoleId, []),
    ).resolves.toEqual({
      status: "rejected",
      message: ROLE_REJECTION_MESSAGES.superUserPermissionsLocked,
    });
    expect(await getUserAccess(superUser.userId)).toMatchObject({
      isSuperUser: true,
    });
  });

  it("RF-ROL-03: el rol Usuario inicia solo con Documentación y es editable", async () => {
    const userRoleId = await findRoleId("Usuario");
    const user = await createUserWithRole("usuario@hospicare.test", userRoleId);
    expect([...user.permissions]).toEqual(["documentation.app.view"]);

    await expect(
      assignRolePermissions(superUser, userRoleId, [
        "documentation.app.view",
        "admin.roles.view",
      ]),
    ).resolves.toEqual({ status: "success" });
  });

  it("RF-ROL-04: crea un rol sin permisos y rechaza nombres repetidos sin distinguir mayúsculas", async () => {
    await expect(
      createRole(superUser, { name: "Enfermería", description: null }),
    ).resolves.toEqual({ status: "success" });
    const role = (await listRoles()).find((item) => item.name === "Enfermería");
    expect(role?.permissions).toEqual([]);

    await expect(
      createRole(superUser, { name: "ENFERMERÍA", description: null }),
    ).resolves.toEqual({
      status: "rejected",
      message: ROLE_REJECTION_MESSAGES.nameTaken,
    });
  });

  it("RF-ROL-04: el nombre debe tener de 2 a 80 caracteres", () => {
    expect(
      roleDetailsSchema.safeParse({ name: " A ", description: "" }).success,
    ).toBe(false);
    expect(
      roleDetailsSchema.safeParse({ name: "A".repeat(81), description: "" })
        .success,
    ).toBe(false);
    expect(
      roleDetailsSchema.parse({ name: "  Psicología ", description: " " }),
    ).toEqual({ name: "Psicología", description: null });
  });

  it("RF-ROL-05: edita nombre y descripción de un rol propio, nunca de uno de sistema", async () => {
    await createRole(superUser, { name: "Enfermeria", description: null });
    const roleId = await findRoleId("Enfermeria");

    await expect(
      updateRole(superUser, roleId, {
        name: "Enfermería",
        description: "Turnos de enfermería",
      }),
    ).resolves.toEqual({ status: "success" });
    expect(
      (await listRoles()).find((role) => role.id === roleId),
    ).toMatchObject({
      name: "Enfermería",
      description: "Turnos de enfermería",
    });

    await expect(
      updateRole(superUser, await findRoleId("Usuario"), {
        name: "Personal",
        description: null,
      }),
    ).resolves.toEqual({
      status: "rejected",
      message: ROLE_REJECTION_MESSAGES.systemRoleLocked,
    });
  });

  it("RF-ROL-06: asigna y quita permisos de un rol", async () => {
    const roleId = await createRoleWithPermissions(superUser, "Admisión", [
      "admin.roles.view",
      "documentation.app.view",
    ]);
    await assignRolePermissions(superUser, roleId, ["admin.roles.view"]);

    const role = (await listRoles()).find((item) => item.id === roleId);
    expect(role?.permissions).toEqual(["admin.roles.view"]);
  });

  it("R-01: solo se otorgan permisos propios y nunca sobre el propio rol", async () => {
    const managerRoleId = await createRoleWithPermissions(
      superUser,
      "Coordinación",
      ["admin.roles.view", "admin.roles.assign_permissions"],
    );
    const manager = await createUserWithRole(
      "coordinacion@hospicare.test",
      managerRoleId,
    );
    const otherRoleId = await createRoleWithPermissions(
      superUser,
      "Trabajo social",
      ["documentation.app.view"],
    );

    await expect(
      assignRolePermissions(manager, otherRoleId, [
        "documentation.app.view",
        "admin.roles.delete",
      ]),
    ).resolves.toEqual({
      status: "rejected",
      message: ROLE_REJECTION_MESSAGES.permissionNotHeld,
    });
    await expect(
      assignRolePermissions(manager, managerRoleId, [
        "admin.roles.view",
        "admin.roles.assign_permissions",
        "admin.roles.delete",
      ]),
    ).resolves.toEqual({
      status: "rejected",
      message: ROLE_REJECTION_MESSAGES.ownRolePermissionsLocked,
    });
    await expect(
      assignRolePermissions(manager, otherRoleId, ["admin.roles.view"]),
    ).resolves.toEqual({ status: "success" });
    expect(
      (await listRoles()).find((role) => role.id === otherRoleId)?.permissions,
    ).toEqual(["admin.roles.view"]);
  });

  it("RF-ROL-07: elimina un rol propio solo si no tiene usuarios", async () => {
    const freeRoleId = await createRoleWithPermissions(superUser, "Libre", []);
    const usedRoleId = await createRoleWithPermissions(superUser, "En uso", []);
    await createUserWithRole("en.uso@hospicare.test", usedRoleId);

    await expect(deleteRole(superUser, freeRoleId)).resolves.toEqual({
      status: "success",
    });
    await expect(deleteRole(superUser, usedRoleId)).resolves.toEqual({
      status: "rejected",
      message: ROLE_REJECTION_MESSAGES.roleInUse,
    });
    expect((await listRoles()).map((role) => role.name)).toContain("En uso");
  });

  it("RF-ACC-07: el cambio de permisos rige en la próxima lectura, sin nuevo ingreso", async () => {
    const roleId = await createRoleWithPermissions(superUser, "Psicología", []);
    const user = await createUserWithRole("psicologia@hospicare.test", roleId);
    expect(user.permissions.has("admin.roles.view")).toBe(false);

    await assignRolePermissions(superUser, roleId, ["admin.roles.view"]);

    const refreshedAccess = await getUserAccess(user.userId);
    expect(refreshedAccess.permissions.has("admin.roles.view")).toBe(true);
  });

  it("RN-20: cada cambio de rol queda en el registro de actividad con su responsable", async () => {
    const roleId = await createRoleWithPermissions(superUser, "Medicina", [
      "documentation.app.view",
    ]);
    await deleteRole(superUser, roleId);

    const result = await getDatabase().execute<{
      action: string;
      actor_user_id: string | null;
      resource_id: string | null;
    }>(sql`
      select action, actor_user_id, resource_id from audit_log
      where resource in ('role', 'role_permission') and resource_id = ${roleId}
      order by id
    `);
    expect(result.rows.map((row) => row.action)).toEqual([
      "role.created",
      "role_permission.created",
      "role.deleted",
      "role_permission.deleted",
    ]);
    expect(
      result.rows.every((row) => row.actor_user_id === superUser.userId),
    ).toBe(true);
  });
});

describe("CA-03: acciones invocadas sin permiso", () => {
  beforeEach(async () => {
    vi.stubEnv("__NEXT_EXPERIMENTAL_AUTH_INTERRUPTS", "true");
    await resetTestDatabase();
    await createFirstSuperUser(FICTITIOUS_SUPER_USER);

    const email = "sin.permisos@hospicare.test";
    await createUserWithRole(email, await findRoleId("Usuario"));
    const response = await getAuth().api.signInEmail({
      body: { email, password: FICTITIOUS_PASSWORD },
      asResponse: true,
    });
    const sessionCookie = response.headers.get("set-cookie");
    if (!sessionCookie) {
      throw new Error("No se obtuvo la sesión de prueba.");
    }
    requestHeaders.current = new Headers({ cookie: sessionCookie });
  });

  it("CA-03: el servidor rechaza crear, asignar y eliminar roles sin cambiar datos", async () => {
    const userRoleId = await findRoleId("Usuario");
    const rolesBefore = await listRoles();

    await expect(
      createRoleAction({ name: "Intruso", description: "" }),
    ).rejects.toMatchObject({ digest: FORBIDDEN_DIGEST });
    await expect(
      assignRolePermissionsAction(userRoleId, ["admin.roles.delete"]),
    ).rejects.toMatchObject({ digest: FORBIDDEN_DIGEST });
    await expect(deleteRoleAction(userRoleId)).rejects.toMatchObject({
      digest: FORBIDDEN_DIGEST,
    });

    expect(await listRoles()).toEqual(rolesBefore);
  });
});
