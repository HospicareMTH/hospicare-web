import { forbidden } from "next/navigation";
import { cache } from "react";

import type { NavigationDestination } from "@/components/shared/navigation";

import { isPermission, type Permission } from "./permissions";
import { getUserAccess, hasPermission, type UserAccess } from "./service";
import { requireSession } from "./session";

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
    ({ requiredPermission }) =>
      requiredPermission === null ||
      (isPermission(requiredPermission) &&
        hasPermission(access, requiredPermission)),
  );
}
