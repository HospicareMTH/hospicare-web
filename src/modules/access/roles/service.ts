import {
  type Comparator,
  compareText,
  type ListPage,
  paginateList,
} from "@/platform/list-query";
import {
  type OperationResult,
  reject,
  SUCCESS,
} from "@/platform/operation-result";
import { runInTransactionAs } from "@/platform/database/client";

import { ALL_PERMISSIONS, isPermission, type Permission } from "../permissions";
import type { RoleDetails, RoleListQuery, RoleSortKey } from "./schemas";
import {
  addRolePermissions,
  deleteRole as deleteRoleRecord,
  hasInvitationWithRole,
  hasUserWithRole,
  insertRole,
  isRoleNameTaken,
  listRoles as listRoleRecords,
  lockRole,
  removeRolePermissions,
  type RoleOption,
  type RoleSummary,
  updateRoleDetails,
} from "./repository";
import { SUPER_USER_SYSTEM_KEY } from "../authorization/repository";
import { hasPermission, type UserAccess } from "../authorization/service";

export type RoleListItem = Omit<RoleSummary, "systemKey" | "permissions"> & {
  isSystemRole: boolean;
  isSuperUserRole: boolean;
  permissions: Permission[];
};

export async function listRoles(): Promise<RoleListItem[]> {
  const roles = await listRoleRecords();
  return roles.map(({ systemKey, permissions, ...role }) => {
    const isSuperUserRole = systemKey === SUPER_USER_SYSTEM_KEY;
    return {
      ...role,
      isSystemRole: systemKey !== null,
      isSuperUserRole,
      permissions: isSuperUserRole
        ? [...ALL_PERMISSIONS]
        : permissions.filter(isPermission),
    };
  });
}

const ROLE_COMPARATORS: Record<RoleSortKey, Comparator<RoleListItem>> = {
  name: (first, second) => compareText(first.name, second.name),
  permissions: (first, second) =>
    first.permissions.length - second.permissions.length,
  users: (first, second) => first.userCount - second.userCount,
};

export async function searchRoles(
  query: RoleListQuery,
): Promise<ListPage<RoleListItem>> {
  return paginateList(
    await listRoles(),
    query,
    (role) => `${role.name} ${role.description ?? ""}`,
    ROLE_COMPARATORS,
  );
}

export const ROLE_REJECTION_MESSAGES = {
  roleNotFound: "El rol ya no existe. Actualizá la pantalla.",
  nameTaken: "Ya existe un rol con ese nombre.",
  systemRoleLocked: "Los roles de sistema no se pueden modificar ni eliminar.",
  superUserPermissionsLocked:
    "El Super user siempre tiene todos los permisos: no se pueden cambiar.",
  ownRolePermissionsLocked: "No podés cambiar los permisos de tu propio rol.",
  permissionNotHeld: "Solo podés otorgar permisos que vos tenés.",
  roleInUse: "No se puede eliminar: hay usuarios con este rol.",
  roleHasInvitations:
    "No se puede eliminar: el rol figura en invitaciones, aunque estén vencidas o revocadas.",
} as const;

export async function createRole(
  actor: UserAccess,
  details: RoleDetails,
): Promise<OperationResult> {
  return runInTransactionAs(actor.userId, async (transaction) => {
    if (await isRoleNameTaken(transaction, details.name, null)) {
      return reject(ROLE_REJECTION_MESSAGES.nameTaken);
    }
    await insertRole(transaction, details);
    return SUCCESS;
  });
}

export async function updateRole(
  actor: UserAccess,
  roleId: string,
  details: RoleDetails,
): Promise<OperationResult> {
  return runInTransactionAs(actor.userId, async (transaction) => {
    const role = await lockRole(transaction, roleId);
    if (!role) {
      return reject(ROLE_REJECTION_MESSAGES.roleNotFound);
    }
    if (role.systemKey !== null) {
      return reject(ROLE_REJECTION_MESSAGES.systemRoleLocked);
    }
    if (await isRoleNameTaken(transaction, details.name, roleId)) {
      return reject(ROLE_REJECTION_MESSAGES.nameTaken);
    }
    await updateRoleDetails(transaction, roleId, details);
    return SUCCESS;
  });
}

export async function assignRolePermissions(
  actor: UserAccess,
  roleId: string,
  permissions: Permission[],
): Promise<OperationResult> {
  return runInTransactionAs(actor.userId, async (transaction) => {
    const role = await lockRole(transaction, roleId);
    if (!role) {
      return reject(ROLE_REJECTION_MESSAGES.roleNotFound);
    }
    if (role.systemKey === SUPER_USER_SYSTEM_KEY) {
      return reject(ROLE_REJECTION_MESSAGES.superUserPermissionsLocked);
    }
    if (role.id === actor.roleId) {
      return reject(ROLE_REJECTION_MESSAGES.ownRolePermissionsLocked);
    }

    const current = new Set(role.permissions);
    const requested = new Set<string>(permissions);
    const granted = permissions.filter(
      (permission) => !current.has(permission),
    );
    const revoked = role.permissions.filter(
      (permission) => !requested.has(permission),
    );
    if (!granted.every((permission) => hasPermission(actor, permission))) {
      return reject(ROLE_REJECTION_MESSAGES.permissionNotHeld);
    }

    await removeRolePermissions(transaction, roleId, revoked);
    await addRolePermissions(transaction, roleId, granted);
    return SUCCESS;
  });
}

export async function deleteRole(
  actor: UserAccess,
  roleId: string,
): Promise<OperationResult> {
  return runInTransactionAs(actor.userId, async (transaction) => {
    const role = await lockRole(transaction, roleId);
    if (!role) {
      return reject(ROLE_REJECTION_MESSAGES.roleNotFound);
    }
    if (role.systemKey !== null) {
      return reject(ROLE_REJECTION_MESSAGES.systemRoleLocked);
    }
    if (await hasUserWithRole(transaction, roleId)) {
      return reject(ROLE_REJECTION_MESSAGES.roleInUse);
    }
    if (await hasInvitationWithRole(transaction, roleId)) {
      return reject(ROLE_REJECTION_MESSAGES.roleHasInvitations);
    }
    await deleteRoleRecord(transaction, roleId);
    return SUCCESS;
  });
}

export function canGrantRole(
  actor: UserAccess,
  role: { systemKey: string | null; permissions: string[] },
): boolean {
  if (role.systemKey === SUPER_USER_SYSTEM_KEY) {
    return actor.isSuperUser;
  }
  return role.permissions.every(
    (permission) =>
      isPermission(permission) && hasPermission(actor, permission),
  );
}

export async function listInvitableRoles(
  actor: UserAccess,
): Promise<RoleOption[]> {
  const roles = await listRoleRecords();
  return roles
    .filter((role) => canGrantRole(actor, role))
    .map(({ id, name }) => ({ id, name }));
}

export async function listRoleFilterOptions(): Promise<RoleOption[]> {
  const roles = await listRoleRecords();
  return roles.map(({ id, name }) => ({ id, name }));
}
