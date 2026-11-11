"use server";

import { refresh } from "next/cache";
import { z } from "zod";

import { requirePermission } from "./authorization";
import { requireSession } from "./session";
import {
  type AccessRevocationInput,
  accessRevocationSchema,
  newPasswordSchema,
  type NewPasswordInput,
  invitationIdSchema,
  type InvitationInput,
  invitationInputSchema,
  roleDetailsSchema,
  type RoleDetailsInput,
  roleIdSchema,
  rolePermissionsSchema,
  ownNameSchema,
  type OwnNameInput,
  totpUriSchema,
  type UserCreationInput,
  userCreationSchema,
  userIdSchema,
} from "./schemas";
import {
  acceptInvitation,
  assignRolePermissions,
  changeUserRole,
  createInvitation,
  createRole,
  createUser,
  deleteRole,
  type OperationResult,
  restoreUserAccess,
  revokeInvitation,
  renderTotpQrCode,
  revokeUserAccess,
  updateOwnName,
  updateRole,
} from "./service";

export type ActionResult =
  | OperationResult
  | { status: "invalid"; fieldErrors: Record<string, string[] | undefined> };

function toInvalidResult(error: z.ZodError): ActionResult {
  return { status: "invalid", fieldErrors: z.flattenError(error).fieldErrors };
}

const INVALID_REQUEST_MESSAGE =
  "El pedido no es válido. Actualizá la pantalla.";

function toRejectedResult(error: z.ZodError): ActionResult {
  return {
    status: "rejected",
    message: error.issues[0]?.message ?? INVALID_REQUEST_MESSAGE,
  };
}

function refreshOnSuccess(result: OperationResult): OperationResult {
  if (result.status === "success") {
    refresh();
  }
  return result;
}

export async function createRoleAction(
  input: RoleDetailsInput,
): Promise<ActionResult> {
  const { access } = await requirePermission("admin.roles.create");
  const details = roleDetailsSchema.safeParse(input);
  if (!details.success) {
    return toInvalidResult(details.error);
  }
  return refreshOnSuccess(await createRole(access, details.data));
}

export async function updateRoleAction(
  roleId: string,
  input: RoleDetailsInput,
): Promise<ActionResult> {
  const { access } = await requirePermission("admin.roles.update");
  const parsedRoleId = roleIdSchema.safeParse(roleId);
  if (!parsedRoleId.success) {
    return toRejectedResult(parsedRoleId.error);
  }
  const details = roleDetailsSchema.safeParse(input);
  if (!details.success) {
    return toInvalidResult(details.error);
  }
  return refreshOnSuccess(
    await updateRole(access, parsedRoleId.data, details.data),
  );
}

export async function assignRolePermissionsAction(
  roleId: string,
  permissions: string[],
): Promise<ActionResult> {
  const { access } = await requirePermission("admin.roles.assign_permissions");
  const parsedRoleId = roleIdSchema.safeParse(roleId);
  if (!parsedRoleId.success) {
    return toRejectedResult(parsedRoleId.error);
  }
  const parsedPermissions = rolePermissionsSchema.safeParse(permissions);
  if (!parsedPermissions.success) {
    return toRejectedResult(parsedPermissions.error);
  }
  return refreshOnSuccess(
    await assignRolePermissions(
      access,
      parsedRoleId.data,
      parsedPermissions.data,
    ),
  );
}

export async function deleteRoleAction(roleId: string): Promise<ActionResult> {
  const { access } = await requirePermission("admin.roles.delete");
  const parsedRoleId = roleIdSchema.safeParse(roleId);
  if (!parsedRoleId.success) {
    return toRejectedResult(parsedRoleId.error);
  }
  return refreshOnSuccess(await deleteRole(access, parsedRoleId.data));
}

export async function revokeUserAccessAction(
  userId: string,
  input: AccessRevocationInput,
): Promise<ActionResult> {
  const { access } = await requirePermission("admin.users.revoke");
  const parsedUserId = userIdSchema.safeParse(userId);
  if (!parsedUserId.success) {
    return toRejectedResult(parsedUserId.error);
  }
  const revocation = accessRevocationSchema.safeParse(input);
  if (!revocation.success) {
    return toInvalidResult(revocation.error);
  }
  return refreshOnSuccess(
    await revokeUserAccess(access, parsedUserId.data, revocation.data),
  );
}

export async function restoreUserAccessAction(
  userId: string,
): Promise<ActionResult> {
  const { access } = await requirePermission("admin.users.revoke");
  const parsedUserId = userIdSchema.safeParse(userId);
  if (!parsedUserId.success) {
    return toRejectedResult(parsedUserId.error);
  }
  return refreshOnSuccess(await restoreUserAccess(access, parsedUserId.data));
}

export async function createInvitationAction(
  input: InvitationInput,
): Promise<ActionResult> {
  const { access } = await requirePermission("admin.invitations.create");
  const invitation = invitationInputSchema.safeParse(input);
  if (!invitation.success) {
    return toInvalidResult(invitation.error);
  }
  return refreshOnSuccess(await createInvitation(access, invitation.data));
}

export async function revokeInvitationAction(
  invitationId: string,
): Promise<ActionResult> {
  const { access } = await requirePermission("admin.invitations.delete");
  const parsedInvitationId = invitationIdSchema.safeParse(invitationId);
  if (!parsedInvitationId.success) {
    return toRejectedResult(parsedInvitationId.error);
  }
  return refreshOnSuccess(
    await revokeInvitation(access, parsedInvitationId.data),
  );
}

export async function acceptInvitationAction(
  input: NewPasswordInput,
): Promise<ActionResult> {
  const acceptance = newPasswordSchema.safeParse(input);
  if (!acceptance.success) {
    return toInvalidResult(acceptance.error);
  }
  return acceptInvitation(acceptance.data.token, acceptance.data.password);
}

export async function createTotpQrCodeAction(
  totpUri: string,
): Promise<string | null> {
  await requireSession();
  const uri = totpUriSchema.safeParse(totpUri);
  return uri.success ? renderTotpQrCode(uri.data) : null;
}

export async function createUserAction(
  input: UserCreationInput,
): Promise<ActionResult> {
  const { access } = await requirePermission("admin.users.create");
  const user = userCreationSchema.safeParse(input);
  if (!user.success) {
    return toInvalidResult(user.error);
  }
  return refreshOnSuccess(await createUser(access, user.data));
}

export async function changeUserRoleAction(
  userId: string,
  roleId: string,
): Promise<ActionResult> {
  const { access } = await requirePermission("admin.users.update");
  const parsedUserId = userIdSchema.safeParse(userId);
  if (!parsedUserId.success) {
    return toRejectedResult(parsedUserId.error);
  }
  const role = z.object({ roleId: roleIdSchema }).safeParse({ roleId });
  if (!role.success) {
    return toInvalidResult(role.error);
  }
  return refreshOnSuccess(
    await changeUserRole(access, parsedUserId.data, role.data.roleId),
  );
}

export async function updateOwnNameAction(
  input: OwnNameInput,
): Promise<ActionResult> {
  const { user } = await requireSession();
  const name = ownNameSchema.safeParse(input);
  if (!name.success) {
    return toInvalidResult(name.error);
  }
  return refreshOnSuccess(await updateOwnName(user.id, name.data.name));
}
