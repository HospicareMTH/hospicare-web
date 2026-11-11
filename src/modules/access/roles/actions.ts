"use server";

import {
  type ActionResult,
  refreshOnSuccess,
  toInvalidResult,
  toRejectedResult,
} from "@/platform/operation-result";

import {
  type RoleDetailsInput,
  roleDetailsSchema,
  roleIdSchema,
  rolePermissionsSchema,
} from "./schemas";
import {
  assignRolePermissions,
  createRole,
  deleteRole,
  updateRole,
} from "./service";
import { requirePermission } from "../authorization/service";

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
