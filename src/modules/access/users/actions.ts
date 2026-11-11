"use server";

import { z } from "zod";

import {
  type ActionResult,
  refreshOnSuccess,
  toInvalidResult,
  toRejectedResult,
} from "@/platform/operation-result";

import {
  type AccessRevocationInput,
  accessRevocationSchema,
  type UserCreationInput,
  userCreationSchema,
  userIdSchema,
} from "./schemas";
import {
  changeUserRole,
  createUser,
  restoreUserAccess,
  revokeUserAccess,
} from "./service";
import { requirePermission } from "../authorization/service";
import { roleIdSchema } from "../roles/schemas";

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
