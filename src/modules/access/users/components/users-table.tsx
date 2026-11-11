"use client";

import {
  LockKeyholeOpenIcon,
  LockKeyIcon,
  UserAdd01Icon,
  UserSwitchIcon,
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
import { formatDate } from "@/platform/dates";
import type { ListPage } from "@/platform/list-query";
import {
  ActionTableRow,
  type RowAction,
} from "@/components/shared/data-table/action-table-row";
import {
  ListFooter,
  ListToolbar,
  SortableHead,
} from "@/components/shared/data-table/list-controls";
import { DIALOG_BUTTON_CLASS_NAME } from "@/components/shared/form-styles";
import { TableFrame } from "@/components/shared/data-table/table-frame";

import type { RoleOption } from "../../roles/repository";
import { DEFAULT_USER_SORT, type UserListQuery } from "../schemas";
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

const COLUMN_COUNT = 7;
const YES_LABEL = "Sí";
const NO_LABEL = "No";
const HEAD_CLASS_NAME = "font-semibold text-foreground";

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

export function UsersTable({
  userPage,
  query,
  grantableRoles,
  actor,
}: {
  userPage: ListPage<UserListItem>;
  query: UserListQuery;
  grantableRoles: RoleOption[];
  actor: UsersActor;
}) {
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
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

  const sortProps = { sort: query.sort, defaultSort: DEFAULT_USER_SORT };

  return (
    <div className="flex flex-col gap-4">
      <ListToolbar
        search={query.search}
        searchLabel="Buscar usuarios"
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

      <TableFrame>
        <Table className="text-base">
          <TableHeader className="bg-muted/60">
            <TableRow className="hover:bg-transparent">
              <SortableHead label="Nombre" sortKey="name" {...sortProps} />
              <SortableHead
                label="Correo"
                sortKey="email"
                className="hidden @3xl:table-cell"
                {...sortProps}
              />
              <SortableHead
                label="Rol"
                sortKey="role"
                className="hidden @lg:table-cell"
                {...sortProps}
              />
              <TableHead className={HEAD_CLASS_NAME}>Estado</TableHead>
              <TableHead
                className={`hidden @5xl:table-cell ${HEAD_CLASS_NAME}`}
              >
                Correo verificado
              </TableHead>
              <TableHead
                className={`hidden @5xl:table-cell ${HEAD_CLASS_NAME}`}
              >
                Segundo factor
              </TableHead>
              <TableHead className="w-14">
                <span className="sr-only">Acciones</span>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {userPage.items.length === 0 && (
              <TableRow className="hover:bg-transparent">
                <TableCell
                  colSpan={COLUMN_COUNT}
                  className="h-24 text-center whitespace-normal text-muted-foreground"
                >
                  Ningún usuario coincide con “{query.search}”.
                </TableCell>
              </TableRow>
            )}
            {userPage.items.map((user) => (
              <ActionTableRow
                key={user.id}
                actions={getUserActions(user)}
                actionsLabel={`Acciones de ${user.name}`}
                isSelected={user.id === selectedUserId}
                onSelect={() => setSelectedUserId(user.id)}
              >
                <TableCell className="font-medium whitespace-normal">
                  {user.name}
                </TableCell>
                <TableCell className="hidden text-muted-foreground @3xl:table-cell">
                  {user.email}
                </TableCell>
                <TableCell className="hidden @lg:table-cell">
                  {user.roleName}
                </TableCell>
                <TableCell>
                  <AccessStatus user={user} />
                </TableCell>
                <TableCell className="hidden @5xl:table-cell">
                  {user.isEmailVerified ? YES_LABEL : NO_LABEL}
                </TableCell>
                <TableCell className="hidden @5xl:table-cell">
                  {user.isTwoFactorEnabled ? YES_LABEL : NO_LABEL}
                </TableCell>
              </ActionTableRow>
            ))}
          </TableBody>
        </Table>
      </TableFrame>

      <ListFooter
        totalLabel={describeUserCount(userPage.totalCount)}
        page={userPage.page}
        pageCount={userPage.pageCount}
        paginationLabel="Páginas de usuarios"
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
    </div>
  );
}
