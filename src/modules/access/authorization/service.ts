import { cache } from "react";
import { forbidden } from "next/navigation";

import type { NavigationDestination } from "@/components/shared/navigation";

import { ALL_PERMISSIONS, isPermission, type Permission } from "../permissions";
import { requireSession } from "../auth/session";
import { findUserAccessRecord, SUPER_USER_SYSTEM_KEY } from "./repository";

export type UserAccess = {
  userId: string;
  roleId: string | null;
  isSuperUser: boolean;
  permissions: ReadonlySet<Permission>;
};

export async function getUserAccess(userId: string): Promise<UserAccess> {
  const record = await findUserAccessRecord(userId);
  if (!record) {
    return { userId, roleId: null, isSuperUser: false, permissions: new Set() };
  }
  const isSuperUser = record.roleSystemKey === SUPER_USER_SYSTEM_KEY;
  return {
    userId,
    roleId: record.roleId,
    isSuperUser,
    permissions: new Set(
      isSuperUser ? ALL_PERMISSIONS : record.permissions.filter(isPermission),
    ),
  };
}

export function hasPermission(
  access: UserAccess,
  permission: Permission,
): boolean {
  return access.permissions.has(permission);
}

export type CurrentUser = {
  name: string;
  access: UserAccess;
};

export const getCurrentUser = cache(async (): Promise<CurrentUser> => {
  const session = await requireSession();
  return {
    name: session.user.name,
    access: await getUserAccess(session.user.id),
  };
});

export async function requirePermission(
  permission: Permission,
): Promise<CurrentUser> {
  const currentUser = await getCurrentUser();
  if (!hasPermission(currentUser.access, permission)) {
    forbidden();
  }
  return currentUser;
}

export function filterAllowedDestinations(
  access: UserAccess,
  destinations: NavigationDestination[],
): NavigationDestination[] {
  return destinations.filter(
    ({ requiredPermissions }) =>
      requiredPermissions.length === 0 ||
      requiredPermissions.some(
        (permission) =>
          isPermission(permission) && hasPermission(access, permission),
      ),
  );
}
