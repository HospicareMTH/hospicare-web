import { Suspense } from "react";

import { hasPermission, requirePermission } from "../../authorization/service";
import { parseUserListQuery } from "../schemas";

import type { SearchParams } from "@/platform/list-query";

import { listInvitableRoles } from "../../roles/service";
import { searchUsers } from "../service";

import { LoadingStatus } from "@/components/shared/loading-status";

import { UsersTable } from "./users-table";

async function UsersContent({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const { access } = await requirePermission("admin.users.view");
  const query = parseUserListQuery(await searchParams);
  const canCreate = hasPermission(access, "admin.users.create");
  const canChangeRole = hasPermission(access, "admin.users.update");
  const [userPage, grantableRoles] = await Promise.all([
    searchUsers(query),
    canCreate || canChangeRole ? listInvitableRoles(access) : [],
  ]);

  return (
    <UsersTable
      userPage={userPage}
      query={query}
      grantableRoles={grantableRoles}
      actor={{
        userId: access.userId,
        isSuperUser: access.isSuperUser,
        canChangeAccess: hasPermission(access, "admin.users.revoke"),
        canCreate,
        canChangeRole,
      }}
    />
  );
}

export function UsersScreen({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  return (
    <Suspense fallback={<LoadingStatus label="Cargando usuarios…" />}>
      <UsersContent searchParams={searchParams} />
    </Suspense>
  );
}
