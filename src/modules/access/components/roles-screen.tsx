import { Suspense } from "react";

import { ADMINISTRATION_DESTINATION } from "@/components/shared/navigation";
import { SectionSheet } from "@/components/shared/section-sheet";

import { requirePermission } from "../authorization";
import { parseRoleListQuery } from "../schemas";
import { hasPermission, searchRoles } from "../service";
import { RolesTable } from "./roles-table";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

async function RolesContent({ searchParams }: { searchParams: SearchParams }) {
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

export function RolesScreen({ searchParams }: { searchParams: SearchParams }) {
  return (
    <SectionSheet destination={ADMINISTRATION_DESTINATION} title="Roles">
      <Suspense
        fallback={
          <p role="status" className="text-base text-muted-foreground">
            Cargando roles…
          </p>
        }
      >
        <RolesContent searchParams={searchParams} />
      </Suspense>
    </SectionSheet>
  );
}
