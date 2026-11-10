"use client";

import { useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
  FieldLegend,
  FieldSet,
} from "@/components/ui/field";

import { assignRolePermissionsAction } from "../actions";
import { PERMISSION_GROUPS, type Permission } from "../permissions";
import type { RoleListItem } from "../service";
import { runRoleAction } from "./run-role-action";
import { DIALOG_BUTTON_CLASS_NAME } from "./styles";

type PermissionGroup = (typeof PERMISSION_GROUPS)[number];

const LOCK_REASONS = {
  superUser: "El Super user siempre tiene todos los permisos.",
  ownRole: "No podés cambiar los permisos de tu propio rol.",
  notAllowed: "Podés ver estos permisos, pero no cambiarlos.",
} as const;

function describeLock(
  role: RoleListItem,
  ownRoleId: string | null,
  canAssignPermissions: boolean,
): string | null {
  if (role.isSuperUserRole) {
    return LOCK_REASONS.superUser;
  }
  if (role.id === ownRoleId) {
    return LOCK_REASONS.ownRole;
  }
  if (!canAssignPermissions) {
    return LOCK_REASONS.notAllowed;
  }
  return null;
}

function getGroupPermissions(group: PermissionGroup): Permission[] {
  return group.permissions.map((permission) => permission.key);
}

export function RolePermissionsDialog({
  role,
  ownRoleId,
  heldPermissions,
  canAssignPermissions,
  onClose,
}: {
  role: RoleListItem;
  ownRoleId: string | null;
  heldPermissions: Permission[];
  canAssignPermissions: boolean;
  onClose: () => void;
}) {
  const [selected, setSelected] = useState<ReadonlySet<Permission>>(
    () => new Set(role.permissions),
  );
  const [isSaving, startSaving] = useTransition();
  const lockReason = describeLock(role, ownRoleId, canAssignPermissions);
  const isLocked = lockReason !== null;
  const held = new Set(heldPermissions);
  const original = new Set(role.permissions);

  function canToggle(permission: Permission): boolean {
    return !isLocked && (held.has(permission) || original.has(permission));
  }

  function setPermissions(permissions: Permission[], isChecked: boolean) {
    setSelected((current) => {
      const next = new Set(current);
      for (const permission of permissions.filter(canToggle)) {
        if (isChecked) {
          next.add(permission);
        } else {
          next.delete(permission);
        }
      }
      return next;
    });
  }

  const hasUngrantablePermissions =
    !isLocked &&
    PERMISSION_GROUPS.some((group) =>
      getGroupPermissions(group).some((permission) => !canToggle(permission)),
    );

  function save() {
    startSaving(async () => {
      const result = await runRoleAction(
        () => assignRolePermissionsAction(role.id, [...selected]),
        "Permisos guardados.",
      );
      if (result?.status === "success") {
        onClose();
      }
    });
  }

  return (
    <Dialog open onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="max-h-[calc(100dvh-2rem)] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-lg">Permisos de {role.name}</DialogTitle>
          <DialogDescription className="text-base">
            {lockReason ?? "Marcá acciones sueltas o el módulo completo."}
          </DialogDescription>
        </DialogHeader>
        <FieldGroup className="gap-4">
          {PERMISSION_GROUPS.map((group) => {
            const groupPermissions = getGroupPermissions(group);
            const selectedCount = groupPermissions.filter((permission) =>
              selected.has(permission),
            ).length;
            const groupCheckboxId = `permission-group-${group.key}`;
            const groupState =
              selectedCount === groupPermissions.length
                ? true
                : selectedCount > 0
                  ? "indeterminate"
                  : false;

            return (
              <FieldSet key={group.key} className="gap-3 rounded-lg border p-4">
                <FieldLegend className="sr-only">{group.label}</FieldLegend>
                <Field orientation="horizontal">
                  <Checkbox
                    id={groupCheckboxId}
                    checked={groupState}
                    disabled={!groupPermissions.some(canToggle)}
                    onCheckedChange={(isChecked) =>
                      setPermissions(groupPermissions, isChecked === true)
                    }
                  />
                  <FieldLabel
                    htmlFor={groupCheckboxId}
                    className="text-base font-semibold"
                  >
                    {group.label}
                  </FieldLabel>
                  <span className="ml-auto text-sm text-muted-foreground tabular-nums">
                    {selectedCount} de {groupPermissions.length}
                  </span>
                </Field>
                <div className="grid gap-3 pl-7 sm:grid-cols-2">
                  {group.permissions.map((permission) => {
                    const checkboxId = `permission-${permission.key}`;
                    const isToggleable = canToggle(permission.key);
                    return (
                      <Field
                        key={permission.key}
                        orientation="horizontal"
                        data-disabled={isToggleable ? undefined : true}
                      >
                        <Checkbox
                          id={checkboxId}
                          checked={selected.has(permission.key)}
                          disabled={!isToggleable}
                          onCheckedChange={(isChecked) =>
                            setPermissions([permission.key], isChecked === true)
                          }
                        />
                        <FieldLabel
                          htmlFor={checkboxId}
                          className="text-base font-normal"
                        >
                          {permission.label}
                        </FieldLabel>
                      </Field>
                    );
                  })}
                </div>
              </FieldSet>
            );
          })}
        </FieldGroup>
        {hasUngrantablePermissions && (
          <FieldDescription>
            Los permisos que no tenés aparecen deshabilitados: solo podés
            otorgar los tuyos.
          </FieldDescription>
        )}
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline" className={DIALOG_BUTTON_CLASS_NAME}>
              {isLocked ? "Cerrar" : "Cancelar"}
            </Button>
          </DialogClose>
          {!isLocked && (
            <Button
              onClick={save}
              disabled={isSaving}
              className={DIALOG_BUTTON_CLASS_NAME}
            >
              {isSaving ? "Guardando…" : "Guardar permisos"}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
