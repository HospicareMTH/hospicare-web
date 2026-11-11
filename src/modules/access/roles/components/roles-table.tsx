"use client";

import {
  Delete02Icon,
  Key01Icon,
  PencilEdit02Icon,
  PlusSignIcon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

import type { Permission } from "../../permissions";
import { DEFAULT_ROLE_SORT, type RoleListQuery } from "../schemas";

import type { ListPage } from "@/platform/list-query";

import type { RoleListItem } from "../service";

import {
  ActionTableRow,
  type RowAction,
} from "@/components/shared/data-table/action-table-row";

import { DeleteRoleDialog } from "./delete-role-dialog";

import {
  ListFooter,
  ListToolbar,
  SortableHead,
} from "@/components/shared/data-table/list-controls";

import { RoleDetailsDialog } from "./role-details-dialog";
import { RolePermissionsDialog } from "./role-permissions-dialog";

import { DIALOG_BUTTON_CLASS_NAME } from "@/components/shared/form-styles";
import { TableFrame } from "@/components/shared/data-table/table-frame";

type RoleAbilities = {
  canCreate: boolean;
  canUpdate: boolean;
  canDelete: boolean;
  canAssignPermissions: boolean;
};

type OpenDialog =
  | { kind: "create" }
  | { kind: "edit"; role: RoleListItem }
  | { kind: "permissions"; role: RoleListItem }
  | { kind: "delete"; role: RoleListItem };

const ALL_PERMISSIONS_LABEL = "Todos";
const COLUMN_COUNT = 5;

function describeRoleCount(count: number): string {
  return count === 1 ? "1 rol" : `${count} roles`;
}

export function RolesTable({
  rolePage,
  query,
  heldPermissions,
  ownRoleId,
  abilities,
}: {
  rolePage: ListPage<RoleListItem>;
  query: RoleListQuery;
  heldPermissions: Permission[];
  ownRoleId: string | null;
  abilities: RoleAbilities;
}) {
  const [selectedRoleId, setSelectedRoleId] = useState<string | null>(null);
  const [openDialog, setOpenDialog] = useState<OpenDialog | null>(null);
  const closeDialog = () => setOpenDialog(null);

  function getRoleActions(role: RoleListItem): RowAction[] {
    const actions: RowAction[] = [];
    if (abilities.canUpdate && !role.isSystemRole) {
      actions.push({
        label: "Editar",
        icon: PencilEdit02Icon,
        isDestructive: false,
        open: () => setOpenDialog({ kind: "edit", role }),
      });
    }
    actions.push({
      label: "Permisos",
      icon: Key01Icon,
      isDestructive: false,
      open: () => setOpenDialog({ kind: "permissions", role }),
    });
    if (abilities.canDelete && !role.isSystemRole) {
      actions.push({
        label: "Eliminar",
        icon: Delete02Icon,
        isDestructive: true,
        open: () => setOpenDialog({ kind: "delete", role }),
      });
    }
    return actions;
  }

  const sortProps = { sort: query.sort, defaultSort: DEFAULT_ROLE_SORT };

  return (
    <div className="flex flex-col gap-4">
      <ListToolbar
        search={query.search}
        searchLabel="Buscar roles"
        action={
          abilities.canCreate && (
            <Button
              onClick={() => setOpenDialog({ kind: "create" })}
              className={DIALOG_BUTTON_CLASS_NAME}
            >
              <HugeiconsIcon
                icon={PlusSignIcon}
                data-icon="inline-start"
                aria-hidden="true"
              />
              Nuevo rol
            </Button>
          )
        }
      />

      <TableFrame>
        <Table className="text-base">
          <TableHeader className="bg-muted/60">
            <TableRow className="hover:bg-transparent">
              <SortableHead label="Nombre" sortKey="name" {...sortProps} />
              <TableHead className="hidden font-semibold text-foreground @3xl:table-cell">
                Descripción
              </TableHead>
              <SortableHead
                label="Permisos"
                sortKey="permissions"
                className="hidden @lg:table-cell"
                {...sortProps}
              />
              <SortableHead label="Usuarios" sortKey="users" {...sortProps} />
              <TableHead className="w-14">
                <span className="sr-only">Acciones</span>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rolePage.items.length === 0 && (
              <TableRow className="hover:bg-transparent">
                <TableCell
                  colSpan={COLUMN_COUNT}
                  className="h-24 text-center whitespace-normal text-muted-foreground"
                >
                  Ningún rol coincide con “{query.search}”.
                </TableCell>
              </TableRow>
            )}
            {rolePage.items.map((role) => (
              <ActionTableRow
                key={role.id}
                actions={getRoleActions(role)}
                actionsLabel={`Acciones de ${role.name}`}
                isSelected={role.id === selectedRoleId}
                onSelect={() => setSelectedRoleId(role.id)}
              >
                <TableCell className="font-medium whitespace-normal">
                  <span className="flex flex-wrap items-center gap-2">
                    {role.name}
                    {role.isSystemRole && (
                      <Badge variant="secondary">De sistema</Badge>
                    )}
                  </span>
                </TableCell>
                <TableCell className="hidden max-w-md truncate text-muted-foreground @3xl:table-cell">
                  {role.description}
                </TableCell>
                <TableCell className="hidden tabular-nums @lg:table-cell">
                  {role.isSuperUserRole
                    ? ALL_PERMISSIONS_LABEL
                    : role.permissions.length}
                </TableCell>
                <TableCell className="tabular-nums">{role.userCount}</TableCell>
              </ActionTableRow>
            ))}
          </TableBody>
        </Table>
      </TableFrame>

      <ListFooter
        totalLabel={describeRoleCount(rolePage.totalCount)}
        page={rolePage.page}
        pageCount={rolePage.pageCount}
        paginationLabel="Páginas de roles"
      />

      {openDialog?.kind === "create" && (
        <RoleDetailsDialog role={null} onClose={closeDialog} />
      )}
      {openDialog?.kind === "edit" && (
        <RoleDetailsDialog role={openDialog.role} onClose={closeDialog} />
      )}
      {openDialog?.kind === "permissions" && (
        <RolePermissionsDialog
          role={openDialog.role}
          ownRoleId={ownRoleId}
          heldPermissions={heldPermissions}
          canAssignPermissions={abilities.canAssignPermissions}
          onClose={closeDialog}
        />
      )}
      {openDialog?.kind === "delete" && (
        <DeleteRoleDialog role={openDialog.role} onClose={closeDialog} />
      )}
    </div>
  );
}
