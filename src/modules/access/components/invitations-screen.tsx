import { Suspense } from "react";

import { requirePermission } from "../authorization";
import { parseInvitationListQuery, type SearchParams } from "../schemas";
import {
  hasPermission,
  listInvitableRoles,
  listRoleFilterOptions,
  searchInvitations,
} from "../service";
import { InvitationsTable } from "./invitations-table";
import { LoadingStatus } from "./loading-status";

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
