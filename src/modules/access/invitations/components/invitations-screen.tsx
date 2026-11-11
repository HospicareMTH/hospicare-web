import { Suspense } from "react";

import type { SearchParams } from "@/platform/list-query";
import { LoadingStatus } from "@/components/shared/loading-status";

import { hasPermission, requirePermission } from "../../authorization/service";
import { parseInvitationListQuery } from "../schemas";
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
  const [invitationPage, roleFilterOptions, invitableRoles] = await Promise.all(
    [
      searchInvitations(query),
      listRoleFilterOptions(),
      canInvite ? listInvitableRoles(access) : [],
    ],
  );

  return (
    <InvitationsTable
      invitationPage={invitationPage}
      query={query}
      roleFilterOptions={roleFilterOptions}
      invitableRoles={invitableRoles}
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
    <Suspense fallback={<LoadingStatus label="Cargando invitaciones…" />}>
      <InvitationsContent searchParams={searchParams} />
    </Suspense>
  );
}
