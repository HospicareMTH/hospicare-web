// @vitest-environment node
import { sql } from "drizzle-orm";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { getDatabase } from "@/platform/database/client";
import type { MailMessage } from "@/platform/mail";
import { resetTestDatabase } from "@/platform/database/test-database";

import { getAuth } from "./auth";
import { DEFAULT_INVITATION_SORT, type InvitationListQuery } from "./schemas";
import {
  acceptInvitation,
  createInvitation,
  deleteRole,
  getUserAccess,
  INVITATION_REJECTION_MESSAGES,
  listInvitableRoles,
  previewInvitation,
  revokeInvitation,
  ROLE_REJECTION_MESSAGES,
  searchInvitations,
  type UserAccess,
} from "./service";
import {
  createRoleWithPermissions,
  createSuperUserAccess,
  createUserWithRole,
  FICTITIOUS_PASSWORD,
  findRoleId,
  findUserId,
} from "./test-fixtures";

const sentMails = vi.hoisted(() => ({ messages: [] as MailMessage[] }));
const mailFailure = vi.hoisted(() => ({ shouldFail: false }));

vi.mock("@/platform/mail", () => ({
  sendMail: async (message: MailMessage) => {
    if (mailFailure.shouldFail) {
      throw new Error("Servicio de correo caído en la prueba.");
    }
    sentMails.messages.push(message);
  },
}));

const INVITED_PERSON = {
  name: "Carla Ficticia",
  email: "carla.ficticia@hospicare.test",
};
const SECONDS_PER_DAY = 86_400;
const INVITATION_VALIDITY_DAYS = 7;

const ALL_INVITATIONS: InvitationListQuery = {
  search: "",
  sort: DEFAULT_INVITATION_SORT,
  page: 1,
  state: null,
  roleId: null,
};

function lastInvitationToken(): string {
  const message = sentMails.messages.at(-1);
  if (!message) {
    throw new Error("No se envió ningún correo.");
  }
  const token = new URL(message.actionUrl).searchParams.get("token");
  if (!token) {
    throw new Error("El enlace no trae el token.");
  }
  return token;
}

async function inviteWithUserRole(actor: UserAccess) {
  return createInvitation(actor, {
    ...INVITED_PERSON,
    roleId: await findRoleId("Usuario"),
  });
}

async function findOnlyInvitationId(): Promise<string> {
  const page = await searchInvitations(ALL_INVITATIONS);
  const [invitation] = page.items;
  if (!invitation) {
    throw new Error("No hay invitaciones.");
  }
  return invitation.id;
}

async function expireInvitations(): Promise<void> {
  await getDatabase().execute(
    sql`update invitations set expires_at = now() - interval '1 minute'`,
  );
}

describe("invitaciones", () => {
  let superUser: UserAccess;

  beforeEach(async () => {
    sentMails.messages = [];
    mailFailure.shouldFail = false;
    await resetTestDatabase();
    superUser = await createSuperUserAccess();
  });

  it("RF-INV-01, RNF-02: invita por correo con un enlace de 7 días y guarda solo el hash del token", async () => {
    await expect(inviteWithUserRole(superUser)).resolves.toEqual({
      status: "success",
    });

    const token = lastInvitationToken();
    expect(sentMails.messages.at(-1)).toMatchObject({
      to: INVITED_PERSON.email,
      subject: "Te invitaron a Hospicare",
    });
    const result = await getDatabase().execute<{
      token_hash: string;
      valid_seconds: number;
    }>(sql`
      select token_hash, extract(epoch from expires_at - created_at)::int as valid_seconds
      from invitations
    `);
    const [row] = result.rows;
    expect(row?.token_hash).not.toContain(token);
    expect(row?.valid_seconds).toBeGreaterThanOrEqual(
      INVITATION_VALIDITY_DAYS * SECONDS_PER_DAY - 1,
    );
    await expect(previewInvitation(token)).resolves.toEqual({
      status: "valid",
      name: INVITED_PERSON.name,
      email: INVITED_PERSON.email,
      roleName: "Usuario",
    });
  });

  it("RF-INV-02: rechaza correos con cuenta o con invitación pendiente vigente", async () => {
    await inviteWithUserRole(superUser);
    await expect(inviteWithUserRole(superUser)).resolves.toEqual({
      status: "rejected",
      message: INVITATION_REJECTION_MESSAGES.invitationPending,
    });

    await expireInvitations();
    await expect(inviteWithUserRole(superUser)).resolves.toEqual({
      status: "success",
    });

    await expect(
      createInvitation(superUser, {
        name: "Ana",
        email: "ana.prueba@hospicare.test",
        roleId: await findRoleId("Usuario"),
      }),
    ).resolves.toEqual({
      status: "rejected",
      message: INVITATION_REJECTION_MESSAGES.emailRegistered,
    });
  });

  it("RF-INV-03: si el correo no sale, la invitación queda revocada y se avisa", async () => {
    mailFailure.shouldFail = true;

    await expect(inviteWithUserRole(superUser)).resolves.toEqual({
      status: "rejected",
      message: INVITATION_REJECTION_MESSAGES.mailFailed,
    });
    const page = await searchInvitations(ALL_INVITATIONS);
    expect(page.items.map((invitation) => invitation.state)).toEqual([
      "revoked",
    ]);
  });

  it("R-01: nadie invita con un rol que le daría más permisos de los que tiene", async () => {
    const inviterRoleId = await createRoleWithPermissions(
      superUser,
      "Admisión",
      ["admin.invitations.create"],
    );
    const inviter = await createUserWithRole(
      "admision@hospicare.test",
      inviterRoleId,
    );
    const strongerRoleId = await createRoleWithPermissions(
      superUser,
      "Coordinación",
      ["admin.roles.delete"],
    );

    await expect(
      createInvitation(inviter, {
        ...INVITED_PERSON,
        roleId: await findRoleId("Super user"),
      }),
    ).resolves.toEqual({
      status: "rejected",
      message: INVITATION_REJECTION_MESSAGES.superUserRoleOnly,
    });
    await expect(
      createInvitation(inviter, { ...INVITED_PERSON, roleId: strongerRoleId }),
    ).resolves.toEqual({
      status: "rejected",
      message: INVITATION_REJECTION_MESSAGES.roleNotAllowed,
    });
    expect(
      (await listInvitableRoles(inviter)).map((role) => role.name),
    ).toEqual(["Admisión"]);
  });

  it("RF-INV-04: revoca invitaciones pendientes y deja el enlace inutilizable", async () => {
    await inviteWithUserRole(superUser);
    const token = lastInvitationToken();

    await expect(
      revokeInvitation(superUser, await findOnlyInvitationId()),
    ).resolves.toEqual({ status: "success" });
    await expect(previewInvitation(token)).resolves.toEqual({
      status: "invalid",
    });
    await expect(
      revokeInvitation(superUser, await findOnlyInvitationId()),
    ).resolves.toEqual({
      status: "rejected",
      message: INVITATION_REJECTION_MESSAGES.invitationNotPending,
    });
  });

  it("RF-ACC-17: la persona invitada crea su cuenta con el nombre, correo y rol de la invitación", async () => {
    await inviteWithUserRole(superUser);

    await expect(
      acceptInvitation(lastInvitationToken(), FICTITIOUS_PASSWORD),
    ).resolves.toEqual({ status: "success" });

    const access = await getUserAccess(await findUserId(INVITED_PERSON.email));
    expect([...access.permissions]).toEqual(["documentation.app.view"]);
    await expect(
      getAuth().api.signInEmail({
        body: { email: INVITED_PERSON.email, password: FICTITIOUS_PASSWORD },
      }),
    ).resolves.toMatchObject({ user: { name: INVITED_PERSON.name } });
  });

  it("CA-05: un enlace usado, revocado o vencido no crea la cuenta", async () => {
    await inviteWithUserRole(superUser);
    const usedToken = lastInvitationToken();
    await acceptInvitation(usedToken, FICTITIOUS_PASSWORD);
    await expect(
      acceptInvitation(usedToken, FICTITIOUS_PASSWORD),
    ).resolves.toEqual({
      status: "rejected",
      message: INVITATION_REJECTION_MESSAGES.invalidLink,
    });

    await createInvitation(superUser, {
      name: "Revocada",
      email: "revocada@hospicare.test",
      roleId: await findRoleId("Usuario"),
    });
    const revokedToken = lastInvitationToken();
    const pending = await searchInvitations({
      ...ALL_INVITATIONS,
      state: "pending",
    });
    await revokeInvitation(superUser, pending.items[0]?.id ?? "");

    await createInvitation(superUser, {
      name: "Vencida",
      email: "vencida@hospicare.test",
      roleId: await findRoleId("Usuario"),
    });
    const expiredToken = lastInvitationToken();
    await expireInvitations();

    for (const token of [revokedToken, expiredToken]) {
      await expect(
        acceptInvitation(token, FICTITIOUS_PASSWORD),
      ).resolves.toEqual({
        status: "rejected",
        message: INVITATION_REJECTION_MESSAGES.invalidLink,
      });
    }
    const accounts = await getDatabase().execute<{ total: number }>(
      sql`select count(*)::int as total from users where email like '%vencida%' or email like '%revocada%'`,
    );
    expect(accounts.rows[0]?.total).toBe(0);
  });

  it("RF-INV-05: filtra por estado, incluido vencida, y por rol", async () => {
    const nursingRoleId = await createRoleWithPermissions(
      superUser,
      "Enfermería",
      [],
    );
    await inviteWithUserRole(superUser);
    await expireInvitations();
    await createInvitation(superUser, {
      name: "Diego Ficticio",
      email: "diego@hospicare.test",
      roleId: nursingRoleId,
    });

    const expired = await searchInvitations({
      ...ALL_INVITATIONS,
      state: "expired",
    });
    expect(expired.items.map((invitation) => invitation.email)).toEqual([
      INVITED_PERSON.email,
    ]);
    const nursing = await searchInvitations({
      ...ALL_INVITATIONS,
      roleId: nursingRoleId,
    });
    expect(nursing.items.map((invitation) => invitation.state)).toEqual([
      "pending",
    ]);
  });

  it("RF-ROL-07: no se elimina un rol que figura en invitaciones", async () => {
    const roleId = await createRoleWithPermissions(
      superUser,
      "Voluntariado",
      [],
    );
    await createInvitation(superUser, { ...INVITED_PERSON, roleId });
    await revokeInvitation(superUser, await findOnlyInvitationId());

    await expect(deleteRole(superUser, roleId)).resolves.toEqual({
      status: "rejected",
      message: ROLE_REJECTION_MESSAGES.roleHasInvitations,
    });
  });

  it("RN-20: el registro de actividad anota invitaciones sin el hash del token", async () => {
    await inviteWithUserRole(superUser);
    await acceptInvitation(lastInvitationToken(), FICTITIOUS_PASSWORD);

    const result = await getDatabase().execute<{
      action: string;
      actor_user_id: string | null;
      values: string;
    }>(sql`
      select action, actor_user_id, coalesce(previous_value, '{}')::text || coalesce(new_value, '{}')::text as values
      from audit_log where resource = 'invitation' order by id
    `);
    expect(result.rows.map((row) => row.action)).toEqual([
      "invitation.created",
      "invitation.updated",
    ]);
    expect(result.rows[0]?.actor_user_id).toBe(superUser.userId);
    expect(result.rows.some((row) => row.values.includes("token_hash"))).toBe(
      false,
    );
  });
});
