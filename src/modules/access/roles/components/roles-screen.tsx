import { Suspense } from "react";

import type { SearchParams } from "@/platform/list-query";
import { DataTableSkeleton } from "@/components/shared/data-table/data-table-skeleton";

import { hasPermission, requirePermission } from "../../authorization/service";
import { getHiddenColumns } from "../../account/service";
import { parseRoleListQuery, ROLES_TABLE_KEY } from "../schemas";
import { searchRoles } from "../service";
import { RolesTable } from "./roles-table";

async function RolesContent({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const { access } = await requirePermission("admin.roles.view");
  const query = parseRoleListQuery(await searchParams);
  const [rolePage, hiddenColumns] = await Promise.all([
    searchRoles(query),
    getHiddenColumns(access.userId, ROLES_TABLE_KEY),
  ]);

  return (
    <RolesTable
      rolePage={rolePage}
      hiddenColumns={hiddenColumns}
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
    <Suspense fallback={<DataTableSkeleton label="Cargando roles…" />}>
      <RolesContent searchParams={searchParams} />
    </Suspense>
  );
}
