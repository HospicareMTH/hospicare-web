"use client";

import {
  ArrowDown01Icon,
  ArrowLeft01Icon,
  ArrowRight01Icon,
  ArrowUp01Icon,
  ArrowUpDownIcon,
  Delete02Icon,
  Key01Icon,
  MoreVerticalIcon,
  PencilEdit02Icon,
  PlusSignIcon,
  Search01Icon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon, type IconSvgElement } from "@hugeicons/react";
import Form from "next/form";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

import type { Permission } from "../permissions";
import {
  formatRoleSort,
  type RoleListQuery,
  type RoleSortKey,
} from "../schemas";
import type { RoleListItem, RolePage } from "../service";
import { DeleteRoleDialog } from "./delete-role-dialog";
import { RoleDetailsDialog } from "./role-details-dialog";
import { RolePermissionsDialog } from "./role-permissions-dialog";
import { DIALOG_BUTTON_CLASS_NAME, FIELD_CONTROL_CLASS_NAME } from "./styles";

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

type RoleAction = {
  label: string;
  icon: IconSvgElement;
  isDestructive: boolean;
  open: () => void;
};

const DEFAULT_SORT = formatRoleSort({ key: "name", isDescending: false });
const FIRST_PAGE = 1;
const ALL_PERMISSIONS_LABEL = "Todos";

function buildListHref(pathname: string, query: RoleListQuery): string {
  const searchParams = new URLSearchParams();
  if (query.search) {
    searchParams.set("buscar", query.search);
  }
  const sort = formatRoleSort(query.sort);
  if (sort !== DEFAULT_SORT) {
    searchParams.set("orden", sort);
  }
  if (query.page > FIRST_PAGE) {
    searchParams.set("pagina", String(query.page));
  }
  const queryString = searchParams.toString();
  return queryString ? `${pathname}?${queryString}` : pathname;
}

function describeRoleCount(count: number): string {
  return count === 1 ? "1 rol" : `${count} roles`;
}

function SortableHead({
  label,
  sortKey,
  query,
  className,
}: {
  label: string;
  sortKey: RoleSortKey;
  query: RoleListQuery;
  className?: string;
}) {
  const pathname = usePathname();
  const isActive = query.sort.key === sortKey;
  const isDescending = isActive && query.sort.isDescending;
  const href = buildListHref(pathname, {
    ...query,
    sort: { key: sortKey, isDescending: isActive && !query.sort.isDescending },
    page: FIRST_PAGE,
  });
  const icon = !isActive
    ? ArrowUpDownIcon
    : isDescending
      ? ArrowDown01Icon
      : ArrowUp01Icon;

  return (
    <TableHead
      aria-sort={
        isActive ? (isDescending ? "descending" : "ascending") : "none"
      }
      className={className}
    >
      <Button
        asChild
        variant="ghost"
        className="-ml-2 h-9 px-2 text-sm font-semibold text-foreground"
      >
        <Link href={href} scroll={false}>
          {label}
          <HugeiconsIcon
            icon={icon}
            data-icon="inline-end"
            className={isActive ? "text-primary" : "text-muted-foreground"}
            aria-hidden="true"
          />
        </Link>
      </Button>
    </TableHead>
  );
}

function PaginationControls({
  rolePage,
  query,
}: {
  rolePage: RolePage;
  query: RoleListQuery;
}) {
  const pathname = usePathname();
  if (rolePage.pageCount <= FIRST_PAGE) {
    return null;
  }

  const previousPage = rolePage.page - 1;
  const nextPage = rolePage.page + 1;

  return (
    <nav aria-label="Páginas de roles" className="flex items-center gap-2">
      <Button
        asChild={previousPage >= FIRST_PAGE}
        variant="outline"
        disabled={previousPage < FIRST_PAGE}
        className={DIALOG_BUTTON_CLASS_NAME}
      >
        {previousPage >= FIRST_PAGE ? (
          <Link
            href={buildListHref(pathname, { ...query, page: previousPage })}
          >
            <HugeiconsIcon icon={ArrowLeft01Icon} aria-hidden="true" />
            Anterior
          </Link>
        ) : (
          <>
            <HugeiconsIcon icon={ArrowLeft01Icon} aria-hidden="true" />
            Anterior
          </>
        )}
      </Button>
      <span className="px-1 text-sm text-muted-foreground tabular-nums">
        Página {rolePage.page} de {rolePage.pageCount}
      </span>
      <Button
        asChild={nextPage <= rolePage.pageCount}
        variant="outline"
        disabled={nextPage > rolePage.pageCount}
        className={DIALOG_BUTTON_CLASS_NAME}
      >
        {nextPage <= rolePage.pageCount ? (
          <Link href={buildListHref(pathname, { ...query, page: nextPage })}>
            Siguiente
            <HugeiconsIcon icon={ArrowRight01Icon} aria-hidden="true" />
          </Link>
        ) : (
          <>
            Siguiente
            <HugeiconsIcon icon={ArrowRight01Icon} aria-hidden="true" />
          </>
        )}
      </Button>
    </nav>
  );
}

export function RolesTable({
  rolePage,
  query,
  heldPermissions,
  ownRoleId,
  abilities,
}: {
  rolePage: RolePage;
  query: RoleListQuery;
  heldPermissions: Permission[];
  ownRoleId: string | null;
  abilities: RoleAbilities;
}) {
  const pathname = usePathname();
  const [selectedRoleId, setSelectedRoleId] = useState<string | null>(null);
  const [openDialog, setOpenDialog] = useState<OpenDialog | null>(null);
  const closeDialog = () => setOpenDialog(null);

  function getRoleActions(role: RoleListItem): RoleAction[] {
    const actions: RoleAction[] = [];
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
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Form
          action={pathname}
          role="search"
          className="flex w-full items-center gap-2 sm:max-w-md"
        >
          {formatRoleSort(query.sort) !== DEFAULT_SORT && (
            <input
              type="hidden"
              name="orden"
              value={formatRoleSort(query.sort)}
            />
          )}
          <Input
            type="search"
            name="buscar"
            defaultValue={query.search}
            aria-label="Buscar roles"
            placeholder="Buscar roles"
            className={FIELD_CONTROL_CLASS_NAME}
          />
          <Button
            type="submit"
            variant="outline"
            className={DIALOG_BUTTON_CLASS_NAME}
          >
            <HugeiconsIcon
              icon={Search01Icon}
              data-icon="inline-start"
              aria-hidden="true"
            />
            Buscar
          </Button>
        </Form>
        {abilities.canCreate && (
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
        )}
      </div>

      <div className="overflow-hidden rounded-xl border">
        <Table className="text-base">
          <TableHeader className="bg-muted/60">
            <TableRow className="hover:bg-transparent">
              <SortableHead label="Nombre" sortKey="name" query={query} />
              <TableHead className="hidden font-semibold text-foreground md:table-cell">
                Descripción
              </TableHead>
              <SortableHead
                label="Permisos"
                sortKey="permissions"
                query={query}
                className="hidden sm:table-cell"
              />
              <SortableHead label="Usuarios" sortKey="users" query={query} />
              <TableHead className="w-14">
                <span className="sr-only">Acciones</span>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rolePage.roles.length === 0 && (
              <TableRow className="hover:bg-transparent">
                <TableCell
                  colSpan={5}
                  className="h-24 text-center whitespace-normal text-muted-foreground"
                >
                  Ningún rol coincide con “{query.search}”.
                </TableCell>
              </TableRow>
            )}
            {rolePage.roles.map((role) => {
              const isSelected = role.id === selectedRoleId;
              const actions = getRoleActions(role);
              return (
                <ContextMenu key={role.id}>
                  <ContextMenuTrigger asChild>
                    <TableRow
                      aria-selected={isSelected}
                      data-state={isSelected ? "selected" : undefined}
                      onClick={() => setSelectedRoleId(role.id)}
                      onContextMenu={() => setSelectedRoleId(role.id)}
                      className="h-14 data-[state=selected]:bg-primary/10"
                    >
                      <TableCell className="font-medium whitespace-normal">
                        <span className="flex flex-wrap items-center gap-2">
                          {role.name}
                          {role.isSystemRole && (
                            <Badge variant="secondary">De sistema</Badge>
                          )}
                        </span>
                      </TableCell>
                      <TableCell className="hidden max-w-md truncate text-muted-foreground md:table-cell">
                        {role.description}
                      </TableCell>
                      <TableCell className="hidden tabular-nums sm:table-cell">
                        {role.isSuperUserRole
                          ? ALL_PERMISSIONS_LABEL
                          : role.permissions.length}
                      </TableCell>
                      <TableCell className="tabular-nums">
                        {role.userCount}
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="size-10"
                              aria-label={`Acciones de ${role.name}`}
                            >
                              <HugeiconsIcon
                                icon={MoreVerticalIcon}
                                className="size-5"
                                aria-hidden="true"
                              />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            {actions.map((action) => (
                              <DropdownMenuItem
                                key={action.label}
                                variant={
                                  action.isDestructive
                                    ? "destructive"
                                    : "default"
                                }
                                onSelect={action.open}
                                className="h-10 text-base"
                              >
                                <HugeiconsIcon
                                  icon={action.icon}
                                  aria-hidden="true"
                                />
                                {action.label}
                              </DropdownMenuItem>
                            ))}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  </ContextMenuTrigger>
                  <ContextMenuContent>
                    {actions.map((action) => (
                      <ContextMenuItem
                        key={action.label}
                        variant={
                          action.isDestructive ? "destructive" : "default"
                        }
                        onSelect={action.open}
                        className="h-10 text-base"
                      >
                        <HugeiconsIcon icon={action.icon} aria-hidden="true" />
                        {action.label}
                      </ContextMenuItem>
                    ))}
                  </ContextMenuContent>
                </ContextMenu>
              );
            })}
          </TableBody>
        </Table>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          {describeRoleCount(rolePage.totalCount)}
        </p>
        <PaginationControls rolePage={rolePage} query={query} />
      </div>

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
