"use client";

import { Cancel01Icon, MailAdd01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatDate } from "@/platform/dates";

import type { RoleOption } from "../repository";
import {
  DEFAULT_INVITATION_SORT,
  INVITATION_STATE_PARAMETERS,
  INVITATION_STATES,
  type InvitationListQuery,
  type InvitationState,
} from "../schemas";
import type { InvitationListItem, ListPage } from "../service";
import { ActionTableRow, type RowAction } from "./action-table-row";
import { InviteDialog } from "./invite-dialog";
import {
  ListFooter,
  ListToolbar,
  SortableHead,
  useListHref,
} from "./list-controls";
import { RevokeInvitationDialog } from "./revoke-invitation-dialog";
import {
  DIALOG_BUTTON_CLASS_NAME,
  SELECT_ITEM_CLASS_NAME,
  SELECT_TRIGGER_CLASS_NAME,
} from "./styles";
import { TableFrame } from "./table-frame";

const ALL_OPTIONS_VALUE = "todos";
const COLUMN_COUNT = 6;
const HEAD_CLASS_NAME = "font-semibold text-foreground";

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

function describeInvitationCount(count: number): string {
  return count === 1 ? "1 invitación" : `${count} invitaciones`;
}

function FilterSelect({
  label,
  allLabel,
  parameter,
  value,
  options,
}: {
  label: string;
  allLabel: string;
  parameter: string;
  value: string | null;
  options: { value: string; label: string }[];
}) {
  const router = useRouter();
  const buildHref = useListHref();

  return (
    <Select
      value={value ?? ALL_OPTIONS_VALUE}
      onValueChange={(nextValue) =>
        router.push(
          buildHref({
            [parameter]: nextValue === ALL_OPTIONS_VALUE ? null : nextValue,
            pagina: null,
          }),
        )
      }
    >
      <SelectTrigger
        aria-label={label}
        className={`w-full sm:w-48 ${SELECT_TRIGGER_CLASS_NAME}`}
      >
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem
          value={ALL_OPTIONS_VALUE}
          className={SELECT_ITEM_CLASS_NAME}
        >
          {allLabel}
        </SelectItem>
        {options.map((option) => (
          <SelectItem
            key={option.value}
            value={option.value}
            className={SELECT_ITEM_CLASS_NAME}
          >
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

type OpenDialog =
  { kind: "invite" } | { kind: "revoke"; invitation: InvitationListItem };

export function InvitationsTable({
  invitationPage,
  query,
  roleFilterOptions,
  invitableRoles,
  abilities,
}: {
  invitationPage: ListPage<InvitationListItem>;
  query: InvitationListQuery;
  roleFilterOptions: RoleOption[];
  invitableRoles: RoleOption[];
  abilities: { canInvite: boolean; canRevoke: boolean };
}) {
  const [selectedInvitationId, setSelectedInvitationId] = useState<
    string | null
  >(null);
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

  const sortProps = { sort: query.sort, defaultSort: DEFAULT_INVITATION_SORT };

  return (
    <div className="flex flex-col gap-4">
      <ListToolbar
        search={query.search}
        searchLabel="Buscar invitaciones"
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
      >
        <FilterSelect
          label="Filtrar por estado"
          allLabel="Todos los estados"
          parameter="estado"
          value={query.state ? INVITATION_STATE_PARAMETERS[query.state] : null}
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
      </ListToolbar>

      <TableFrame>
        <Table className="text-base">
          <TableHeader className="bg-muted/60">
            <TableRow className="hover:bg-transparent">
              <SortableHead label="Nombre" sortKey="name" {...sortProps} />
              <TableHead
                className={`hidden @3xl:table-cell ${HEAD_CLASS_NAME}`}
              >
                Correo
              </TableHead>
              <TableHead className={`hidden @lg:table-cell ${HEAD_CLASS_NAME}`}>
                Rol
              </TableHead>
              <TableHead className={HEAD_CLASS_NAME}>Estado</TableHead>
              <SortableHead
                label="Vence"
                sortKey="expiresAt"
                className="hidden @2xl:table-cell"
                {...sortProps}
              />
              <TableHead className="w-14">
                <span className="sr-only">Acciones</span>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {invitationPage.items.length === 0 && (
              <TableRow className="hover:bg-transparent">
                <TableCell
                  colSpan={COLUMN_COUNT}
                  className="h-24 text-center whitespace-normal text-muted-foreground"
                >
                  {hasFilters
                    ? "Ninguna invitación coincide con los filtros."
                    : "Todavía no hay invitaciones."}
                </TableCell>
              </TableRow>
            )}
            {invitationPage.items.map((invitation) => (
              <ActionTableRow
                key={invitation.id}
                actions={getInvitationActions(invitation)}
                actionsLabel={`Acciones de la invitación de ${invitation.name}`}
                isSelected={invitation.id === selectedInvitationId}
                onSelect={() => setSelectedInvitationId(invitation.id)}
              >
                <TableCell className="font-medium whitespace-normal">
                  {invitation.name}
                </TableCell>
                <TableCell className="hidden text-muted-foreground @3xl:table-cell">
                  {invitation.email}
                </TableCell>
                <TableCell className="hidden @lg:table-cell">
                  {invitation.roleName}
                </TableCell>
                <TableCell>
                  <Badge variant={STATE_BADGE_VARIANTS[invitation.state]}>
                    {STATE_LABELS[invitation.state]}
                  </Badge>
                </TableCell>
                <TableCell className="hidden tabular-nums @2xl:table-cell">
                  {formatDate(invitation.expiresAt)}
                </TableCell>
              </ActionTableRow>
            ))}
          </TableBody>
        </Table>
      </TableFrame>

      <ListFooter
        totalLabel={describeInvitationCount(invitationPage.totalCount)}
        page={invitationPage.page}
        pageCount={invitationPage.pageCount}
        paginationLabel="Páginas de invitaciones"
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
    </div>
  );
}
