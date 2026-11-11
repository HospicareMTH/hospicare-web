import { Suspense } from "react";

import type { SearchParams } from "@/platform/list-query";
import { DataTableSkeleton } from "@/components/shared/data-table/data-table-skeleton";

import { hasPermission, requirePermission } from "../../authorization/service";
import { INVITATIONS_TABLE_KEY, parseInvitationListQuery } from "../schemas";
import { getHiddenColumns } from "../../account/service";
import { listInvitableRoles, listRoleFilterOptions } from "../../roles/service";
import { searchInvitations } from "../service";
import { InvitationsTable } from "./invitations-table";

async function InvitationsContent({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const { access } = await requirePermission("admin.invitations.view");
  const query = parseInvitationListQuery(await searchParams);
  const canInvite = hasPermission(access, "admin.invitations.create");
  const [invitationPage, roleFilterOptions, invitableRoles, hiddenColumns] =
    await Promise.all([
      searchInvitations(query),
      listRoleFilterOptions(),
      canInvite ? listInvitableRoles(access) : [],
      getHiddenColumns(access.userId, INVITATIONS_TABLE_KEY),
    ]);

  return (
    <InvitationsTable
      invitationPage={invitationPage}
      query={query}
      roleFilterOptions={roleFilterOptions}
      invitableRoles={invitableRoles}
      hiddenColumns={hiddenColumns}
      abilities={{
        canInvite,
        canRevoke: hasPermission(access, "admin.invitations.delete"),
      }}
    />
  );
}

export function InvitationsScreen({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  return (
    <Suspense fallback={<DataTableSkeleton label="Cargando invitaciones…" />}>
      <InvitationsContent searchParams={searchParams} />
    </Suspense>
  );
}
