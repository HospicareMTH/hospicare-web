"use client";

import {
  LockKeyholeOpenIcon,
  LockKeyIcon,
  UserAdd01Icon,
  UserSwitchIcon,
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
import { formatDate } from "@/platform/dates";
import type { ListPage } from "@/platform/list-query";

import type { RoleOption } from "../../roles/repository";
import { saveHiddenColumns } from "../../account/components/save-hidden-columns";
import {
  DEFAULT_USER_SORT,
  type UserListQuery,
  USERS_TABLE_KEY,
  type UserSortKey,
} from "../schemas";
import type { UserListItem } from "../service";
import { ChangeRoleDialog } from "./change-role-dialog";
import { CreateUserDialog } from "./create-user-dialog";
import { RestoreAccessDialog } from "./restore-access-dialog";
import { RevokeAccessDialog } from "./revoke-access-dialog";

type UsersActor = {
  userId: string;
  isSuperUser: boolean;
  canChangeAccess: boolean;
  canCreate: boolean;
  canChangeRole: boolean;
};

type OpenDialog =
  | { kind: "create" }
  | { kind: "changeRole"; user: UserListItem }
  | { kind: "revoke"; user: UserListItem }
  | { kind: "restore"; user: UserListItem };

const YES_LABEL = "Sí";
const NO_LABEL = "No";

function describeUserCount(count: number): string {
  return count === 1 ? "1 usuario" : `${count} usuarios`;
}

function AccessStatus({ user }: { user: UserListItem }) {
  if (!user.isRevoked) {
    return <Badge variant="secondary">Activo</Badge>;
  }
  return (
    <Badge variant="destructive">
      {user.accessRevokedUntil
        ? `Revocado hasta ${formatDate(user.accessRevokedUntil)}`
        : "Revocado"}
    </Badge>
  );
}

const COLUMNS: DataTableColumn<UserListItem, UserSortKey>[] = [
  {
    id: "name",
    label: "Nombre",
    sortKey: "name",
    canHide: false,
    cellClassName: "font-medium whitespace-normal",
    cell: (user) => user.name,
  },
  {
    id: "email",
    label: "Correo",
    sortKey: "email",
    className: "hidden @3xl:table-cell",
    cellClassName: "text-muted-foreground",
    cell: (user) => user.email,
  },
  {
    id: "role",
    label: "Rol",
    sortKey: "role",
    className: "hidden @lg:table-cell",
    cell: (user) => user.roleName,
  },
  {
    id: "access",
    label: "Estado",
    cell: (user) => <AccessStatus user={user} />,
  },
  {
    id: "emailVerified",
    label: "Correo verificado",
    className: "hidden @5xl:table-cell",
    cell: (user) => (user.isEmailVerified ? YES_LABEL : NO_LABEL),
  },
  {
    id: "twoFactor",
    label: "Segundo factor",
    className: "hidden @5xl:table-cell",
    cell: (user) => (user.isTwoFactorEnabled ? YES_LABEL : NO_LABEL),
  },
];

export function UsersTable({
  userPage,
  query,
  grantableRoles,
  hiddenColumns,
  actor,
}: {
  hiddenColumns: string[];
  userPage: ListPage<UserListItem>;
  query: UserListQuery;
  grantableRoles: RoleOption[];
  actor: UsersActor;
}) {
  const [openDialog, setOpenDialog] = useState<OpenDialog | null>(null);
  const closeDialog = () => setOpenDialog(null);

  function getAccessAction(user: UserListItem): RowAction {
    if (user.isRevoked) {
      return {
        label: "Restaurar acceso",
        icon: LockKeyholeOpenIcon,
        isDestructive: false,
        open: () => setOpenDialog({ kind: "restore", user }),
      };
    }
    return {
      label: "Revocar acceso",
      icon: LockKeyIcon,
      isDestructive: true,
      open: () => setOpenDialog({ kind: "revoke", user }),
    };
  }

  function getUserActions(user: UserListItem): RowAction[] {
    const canManageThisUser =
      user.id !== actor.userId && (!user.isSuperUser || actor.isSuperUser);
    if (!canManageThisUser) {
      return [];
    }
    const actions: RowAction[] = [];
    if (actor.canChangeRole) {
      actions.push({
        label: "Cambiar rol",
        icon: UserSwitchIcon,
        isDestructive: false,
        open: () => setOpenDialog({ kind: "changeRole", user }),
      });
    }
    if (actor.canChangeAccess) {
      actions.push(getAccessAction(user));
    }
    return actions;
  }

  return (
    <>
      <DataTable
        columns={COLUMNS}
        page={userPage}
        query={query}
        defaultSort={DEFAULT_USER_SORT}
        searchLabel="Buscar usuarios"
        emptyMessage={
          query.search
            ? `Ningún usuario coincide con “${query.search}”.`
            : "Todavía no hay usuarios."
        }
        totalLabel={describeUserCount(userPage.totalCount)}
        paginationLabel="Páginas de usuarios"
        getRowActions={getUserActions}
        getActionsLabel={(user) => `Acciones de ${user.name}`}
        hiddenColumns={hiddenColumns}
        onHiddenColumnsChange={(columns) =>
          saveHiddenColumns(USERS_TABLE_KEY, columns)
        }
        action={
          actor.canCreate && (
            <Button
              onClick={() => setOpenDialog({ kind: "create" })}
              className={DIALOG_BUTTON_CLASS_NAME}
            >
              <HugeiconsIcon
                icon={UserAdd01Icon}
                data-icon="inline-start"
                aria-hidden="true"
              />
              Crear usuario
            </Button>
          )
        }
      />

      {openDialog?.kind === "create" && (
        <CreateUserDialog roles={grantableRoles} onClose={closeDialog} />
      )}
      {openDialog?.kind === "changeRole" && (
        <ChangeRoleDialog
          user={openDialog.user}
          roles={grantableRoles}
          onClose={closeDialog}
        />
      )}
      {openDialog?.kind === "revoke" && (
        <RevokeAccessDialog user={openDialog.user} onClose={closeDialog} />
      )}
      {openDialog?.kind === "restore" && (
        <RestoreAccessDialog user={openDialog.user} onClose={closeDialog} />
      )}
    </>
  );
}
