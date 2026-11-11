"use client";

import { Delete02Icon } from "@hugeicons/core-free-icons";

import { deleteRoleAction } from "../actions";
import type { RoleListItem } from "../service";

import { ConfirmActionDialog } from "@/components/shared/confirm-action-dialog";

export function DeleteRoleDialog({
  role,
  onClose,
}: {
  role: RoleListItem;
  onClose: () => void;
}) {
  return (
    <ConfirmActionDialog
      icon={Delete02Icon}
      title={`¿Eliminar el rol ${role.name}?`}
      description="Se borra junto con sus permisos y no se puede deshacer."
      confirmLabel="Eliminar"
      pendingLabel="Eliminando…"
      successMessage="Rol eliminado."
      isDestructive
      action={() => deleteRoleAction(role.id)}
      onClose={onClose}
    />
  );
}
