"use client";

import { Cancel01Icon, MailAdd01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { useState } from "react";

import type { RowAction } from "@/components/shared/data-table/action-table-row";
import {
  DataTable,
  type DataTableColumn,
} from "@/components/shared/data-table/data-table";
import { FilterSelect } from "@/components/shared/data-table/filter-select";
import { DIALOG_BUTTON_CLASS_NAME } from "@/components/shared/form-styles";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatDateTime } from "@/platform/dates";
import type { ListPage } from "@/platform/list-query";

import { saveHiddenColumns } from "../../account/components/save-hidden-columns";
import type { RoleOption } from "../../roles/repository";
import {
  DEFAULT_INVITATION_SORT,
  INVITATION_STATE_PARAMETERS,
  INVITATION_STATES,
  INVITATIONS_TABLE_KEY,
  type InvitationListQuery,
  type InvitationSortKey,
  type InvitationState,
} from "../schemas";
import type { InvitationListItem } from "../service";
import { InviteDialog } from "./invite-dialog";
import { RevokeInvitationDialog } from "./revoke-invitation-dialog";

const STATE_LABELS: Record<InvitationState, string> = {
  pending: "Pendiente",
  expired: "Vencida",
  accepted: "Aceptada",
  revoked: "Revocada",
};

const STATE_FILTER_LABELS: Record<InvitationState, string> = {
  pending: "Pendientes",
  expired: "Vencidas",
  accepted: "Aceptadas",
  revoked: "Revocadas",
};

const STATE_BADGE_VARIANTS: Record<
  InvitationState,
  "secondary" | "outline" | "destructive"
> = {
  pending: "secondary",
  expired: "outline",
  accepted: "outline",
  revoked: "destructive",
};

const COLUMNS: DataTableColumn<InvitationListItem, InvitationSortKey>[] = [
  {
    id: "name",
    label: "Nombre",
    sortKey: "name",
    canHide: false,
    cellClassName: "font-medium whitespace-normal",
    cell: (invitation) => invitation.name,
  },
  {
    id: "email",
    label: "Correo",
    className: "hidden @3xl:table-cell",
    cellClassName: "text-muted-foreground",
    cell: (invitation) => invitation.email,
  },
  {
    id: "role",
    label: "Rol",
    className: "hidden @lg:table-cell",
    cell: (invitation) => invitation.roleName,
  },
  {
    id: "state",
    label: "Estado",
    cell: (invitation) => (
      <Badge variant={STATE_BADGE_VARIANTS[invitation.state]}>
        {STATE_LABELS[invitation.state]}
      </Badge>
    ),
  },
  {
    id: "expiresAt",
    label: "Vence",
    sortKey: "expiresAt",
    className: "hidden @2xl:table-cell",
    cellClassName: "tabular-nums",
    cell: (invitation) => formatDateTime(invitation.expiresAt),
  },
];

function describeInvitationCount(count: number): string {
  return count === 1 ? "1 invitación" : `${count} invitaciones`;
}

type OpenDialog =
  { kind: "invite" } | { kind: "revoke"; invitation: InvitationListItem };

export function InvitationsTable({
  invitationPage,
  query,
  roleFilterOptions,
  invitableRoles,
  hiddenColumns,
  abilities,
}: {
  invitationPage: ListPage<InvitationListItem>;
  query: InvitationListQuery;
  roleFilterOptions: RoleOption[];
  invitableRoles: RoleOption[];
  hiddenColumns: string[];
  abilities: { canInvite: boolean; canRevoke: boolean };
}) {
  const [openDialog, setOpenDialog] = useState<OpenDialog | null>(null);
  const closeDialog = () => setOpenDialog(null);
  const hasFilters =
    query.search !== "" || query.state !== null || query.roleId !== null;

  function getInvitationActions(invitation: InvitationListItem): RowAction[] {
    if (!abilities.canRevoke || invitation.state !== "pending") {
      return [];
    }
    return [
      {
        label: "Revocar invitación",
        icon: Cancel01Icon,
        isDestructive: true,
        open: () => setOpenDialog({ kind: "revoke", invitation }),
      },
    ];
  }

  return (
    <>
      <DataTable
        columns={COLUMNS}
        page={invitationPage}
        query={query}
        defaultSort={DEFAULT_INVITATION_SORT}
        searchLabel="Buscar invitaciones"
        emptyMessage={
          hasFilters
            ? "Ninguna invitación coincide con los filtros."
            : "Todavía no hay invitaciones."
        }
        totalLabel={describeInvitationCount(invitationPage.totalCount)}
        paginationLabel="Páginas de invitaciones"
        getRowActions={getInvitationActions}
        getActionsLabel={(invitation) =>
          `Acciones de la invitación de ${invitation.name}`
        }
        hiddenColumns={hiddenColumns}
        onHiddenColumnsChange={(columns) =>
          saveHiddenColumns(INVITATIONS_TABLE_KEY, columns)
        }
        filters={
          <>
            <FilterSelect
              label="Filtrar por estado"
              allLabel="Todos los estados"
              parameter="estado"
              value={
                query.state ? INVITATION_STATE_PARAMETERS[query.state] : null
              }
              options={INVITATION_STATES.map((state) => ({
                value: INVITATION_STATE_PARAMETERS[state],
                label: STATE_FILTER_LABELS[state],
              }))}
            />
            <FilterSelect
              label="Filtrar por rol"
              allLabel="Todos los roles"
              parameter="rol"
              value={query.roleId}
              options={roleFilterOptions.map((role) => ({
                value: role.id,
                label: role.name,
              }))}
            />
          </>
        }
        action={
          abilities.canInvite && (
            <Button
              onClick={() => setOpenDialog({ kind: "invite" })}
              className={DIALOG_BUTTON_CLASS_NAME}
            >
              <HugeiconsIcon
                icon={MailAdd01Icon}
                data-icon="inline-start"
                aria-hidden="true"
              />
              Invitar
            </Button>
          )
        }
      />

      {openDialog?.kind === "invite" && (
        <InviteDialog roles={invitableRoles} onClose={closeDialog} />
      )}
      {openDialog?.kind === "revoke" && (
        <RevokeInvitationDialog
          invitation={openDialog.invitation}
          onClose={closeDialog}
        />
      )}
    </>
  );
}
