import { Suspense } from "react";

import { requirePermission } from "../authorization";
import { parseRoleListQuery, type SearchParams } from "../schemas";
import { hasPermission, searchRoles } from "../service";
import { LoadingStatus } from "./loading-status";
import { RolesTable } from "./roles-table";

async function RolesContent({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const { access } = await requirePermission("admin.roles.view");
  const query = parseRoleListQuery(await searchParams);
  const rolePage = await searchRoles(query);

  return (
    <RolesTable
      rolePage={rolePage}
      query={query}
      heldPermissions={[...access.permissions]}
      ownRoleId={access.roleId}
      abilities={{
        canCreate: hasPermission(access, "admin.roles.create"),
        canUpdate: hasPermission(access, "admin.roles.update"),
        canDelete: hasPermission(access, "admin.roles.delete"),
        canAssignPermissions: hasPermission(
          access,
          "admin.roles.assign_permissions",
        ),
      }}
    />
  );
}

export function RolesScreen({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  return (
    <Suspense fallback={<LoadingStatus label="Cargando roles…" />}>
      <RolesContent searchParams={searchParams} />
    </Suspense>
  );
}
