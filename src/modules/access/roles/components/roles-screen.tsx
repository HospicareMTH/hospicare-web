import { Suspense } from "react";

import type { SearchParams } from "@/platform/list-query";
import { LoadingStatus } from "@/components/shared/loading-status";

import { hasPermission, requirePermission } from "../../authorization/service";
import { parseRoleListQuery } from "../schemas";
import { searchRoles } from "../service";
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
