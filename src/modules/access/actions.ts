"use server";

import { refresh } from "next/cache";
import { z } from "zod";

import { requirePermission } from "./authorization";
import {
  roleDetailsSchema,
  type RoleDetailsInput,
  roleIdSchema,
  rolePermissionsSchema,
} from "./schemas";
import {
  assignRolePermissions,
  createRole,
  deleteRole,
  type RoleOperationResult,
  updateRole,
} from "./service";

export type RoleActionResult =
  | RoleOperationResult
  | { status: "invalid"; fieldErrors: Record<string, string[] | undefined> };

function toInvalidResult(error: z.ZodError): RoleActionResult {
  return { status: "invalid", fieldErrors: z.flattenError(error).fieldErrors };
}

const INVALID_REQUEST_MESSAGE =
  "El pedido no es válido. Actualizá la pantalla.";

function toRejectedResult(error: z.ZodError): RoleActionResult {
  return {
    status: "rejected",
    message: error.issues[0]?.message ?? INVALID_REQUEST_MESSAGE,
  };
}

function refreshOnSuccess(result: RoleOperationResult): RoleOperationResult {
  if (result.status === "success") {
    refresh();
  }
  return result;
}

export async function createRoleAction(
  input: RoleDetailsInput,
): Promise<RoleActionResult> {
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
): Promise<RoleActionResult> {
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
): Promise<RoleActionResult> {
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

export async function deleteRoleAction(
  roleId: string,
): Promise<RoleActionResult> {
  const { access } = await requirePermission("admin.roles.delete");
  const parsedRoleId = roleIdSchema.safeParse(roleId);
  if (!parsedRoleId.success) {
    return toRejectedResult(parsedRoleId.error);
  }
  return refreshOnSuccess(await deleteRole(access, parsedRoleId.data));
}
