import { Suspense } from "react";

import type { SearchParams } from "@/platform/list-query";
import { DataTableSkeleton } from "@/components/shared/data-table/data-table-skeleton";

import { hasPermission, requirePermission } from "../../authorization/service";
import { getHiddenColumns } from "../../account/service";
import { parseUserListQuery, USERS_TABLE_KEY } from "../schemas";
import { listInvitableRoles } from "../../roles/service";
import { searchUsers } from "../service";
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
  const [userPage, grantableRoles, hiddenColumns] = await Promise.all([
    searchUsers(query),
    canCreate || canChangeRole ? listInvitableRoles(access) : [],
    getHiddenColumns(access.userId, USERS_TABLE_KEY),
  ]);

  return (
    <UsersTable
      userPage={userPage}
      query={query}
      grantableRoles={grantableRoles}
      hiddenColumns={hiddenColumns}
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
    <Suspense fallback={<DataTableSkeleton label="Cargando usuarios…" />}>
      <UsersContent searchParams={searchParams} />
    </Suspense>
  );
}
