"use client";

import {
  Delete02Icon,
  Key01Icon,
  PencilEdit02Icon,
  PlusSignIcon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { useState } from "react";

import type { RowAction } from "@/components/shared/data-table/action-table-row";
import {
  DataTable,
  type DataTableColumn,
} from "@/components/shared/data-table/data-table";
import { DIALOG_BUTTON_CLASS_NAME } from "@/components/shared/form-styles";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { ListPage } from "@/platform/list-query";

import type { Permission } from "../../permissions";
import { saveHiddenColumns } from "../../account/components/save-hidden-columns";
import {
  DEFAULT_ROLE_SORT,
  type RoleListQuery,
  ROLES_TABLE_KEY,
  type RoleSortKey,
} from "../schemas";
import type { RoleListItem } from "../service";
import { DeleteRoleDialog } from "./delete-role-dialog";
import { RoleDetailsDialog } from "./role-details-dialog";
import { RolePermissionsDialog } from "./role-permissions-dialog";

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

const COLUMNS: DataTableColumn<RoleListItem, RoleSortKey>[] = [
  {
    id: "name",
    label: "Nombre",
    sortKey: "name",
    canHide: false,
    cellClassName: "font-medium whitespace-normal",
    cell: (role) => (
      <span className="flex flex-wrap items-center gap-2">
        {role.name}
        {role.isSystemRole && <Badge variant="secondary">De sistema</Badge>}
      </span>
    ),
  },
  {
    id: "description",
    label: "Descripción",
    className: "hidden @3xl:table-cell",
    cellClassName: "max-w-md truncate text-muted-foreground",
    cell: (role) => role.description,
  },
  {
    id: "permissions",
    label: "Permisos",
    sortKey: "permissions",
    className: "hidden @lg:table-cell",
    cellClassName: "tabular-nums",
    cell: (role) =>
      role.isSuperUserRole ? ALL_PERMISSIONS_LABEL : role.permissions.length,
  },
  {
    id: "users",
    label: "Usuarios",
    sortKey: "users",
    cellClassName: "tabular-nums",
    cell: (role) => role.userCount,
  },
];

function describeRoleCount(count: number): string {
  return count === 1 ? "1 rol" : `${count} roles`;
}

export function RolesTable({
  rolePage,
  query,
  heldPermissions,
  ownRoleId,
  hiddenColumns,
  abilities,
}: {
  rolePage: ListPage<RoleListItem>;
  hiddenColumns: string[];
  query: RoleListQuery;
  heldPermissions: Permission[];
  ownRoleId: string | null;
  abilities: RoleAbilities;
}) {
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

  return (
    <>
      <DataTable
        columns={COLUMNS}
        page={rolePage}
        query={query}
        defaultSort={DEFAULT_ROLE_SORT}
        searchLabel="Buscar roles"
        emptyMessage={
          query.search
            ? `Ningún rol coincide con “${query.search}”.`
            : "Todavía no hay roles."
        }
        totalLabel={describeRoleCount(rolePage.totalCount)}
        paginationLabel="Páginas de roles"
        getRowActions={getRoleActions}
        getActionsLabel={(role) => `Acciones de ${role.name}`}
        hiddenColumns={hiddenColumns}
        onHiddenColumnsChange={(columns) =>
          saveHiddenColumns(ROLES_TABLE_KEY, columns)
        }
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
    </>
  );
}
