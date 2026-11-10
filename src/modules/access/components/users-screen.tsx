import { Suspense } from "react";

import { requirePermission } from "../authorization";
import { parseUserListQuery, type SearchParams } from "../schemas";
import { hasPermission, searchUsers } from "../service";
import { LoadingStatus } from "./loading-status";
import { UsersTable } from "./users-table";

async function UsersContent({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const { access } = await requirePermission("admin.users.view");
  const query = parseUserListQuery(await searchParams);

  return (
    <UsersTable
      userPage={await searchUsers(query)}
      query={query}
      actor={{
        userId: access.userId,
        isSuperUser: access.isSuperUser,
        canChangeAccess: hasPermission(access, "admin.users.revoke"),
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
