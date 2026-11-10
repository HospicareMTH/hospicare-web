"use client";

import { LockKeyIcon, LockKeyholeOpenIcon } from "@hugeicons/core-free-icons";
import { useState } from "react";

import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatDate } from "@/platform/dates";

import { DEFAULT_USER_SORT, type UserListQuery } from "../schemas";
import type { ListPage, UserListItem } from "../service";
import { ActionTableRow, type RowAction } from "./action-table-row";
import { ListFooter, ListToolbar, SortableHead } from "./list-controls";
import { RestoreAccessDialog } from "./restore-access-dialog";
import { RevokeAccessDialog } from "./revoke-access-dialog";
import { TableFrame } from "./table-frame";

type UsersActor = {
  userId: string;
  isSuperUser: boolean;
  canChangeAccess: boolean;
};

type OpenDialog =
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
  actor,
}: {
  userPage: ListPage<UserListItem>;
  query: UserListQuery;
  actor: UsersActor;
}) {
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [openDialog, setOpenDialog] = useState<OpenDialog | null>(null);
  const closeDialog = () => setOpenDialog(null);

  function getUserActions(user: UserListItem): RowAction[] {
    const canChangeThisAccess =
      actor.canChangeAccess &&
      user.id !== actor.userId &&
      (!user.isSuperUser || actor.isSuperUser);
    if (!canChangeThisAccess) {
      return [];
    }
    if (user.isRevoked) {
      return [
        {
          label: "Restaurar acceso",
          icon: LockKeyholeOpenIcon,
          isDestructive: false,
          open: () => setOpenDialog({ kind: "restore", user }),
        },
      ];
    }
    return [
      {
        label: "Revocar acceso",
        icon: LockKeyIcon,
        isDestructive: true,
        open: () => setOpenDialog({ kind: "revoke", user }),
      },
    ];
  }

  const sortProps = { sort: query.sort, defaultSort: DEFAULT_USER_SORT };

  return (
    <div className="flex flex-col gap-4">
      <ListToolbar search={query.search} searchLabel="Buscar usuarios" />

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

      {openDialog?.kind === "revoke" && (
        <RevokeAccessDialog user={openDialog.user} onClose={closeDialog} />
      )}
      {openDialog?.kind === "restore" && (
        <RestoreAccessDialog user={openDialog.user} onClose={closeDialog} />
      )}
    </div>
  );
}
