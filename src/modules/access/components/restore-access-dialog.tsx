"use client";

import { LockKeyholeOpenIcon } from "@hugeicons/core-free-icons";

import { restoreUserAccessAction } from "../actions";
import type { UserListItem } from "../service";
import { ConfirmActionDialog } from "./confirm-action-dialog";

export function RestoreAccessDialog({
  user,
  onClose,
}: {
  user: UserListItem;
  onClose: () => void;
}) {
  return (
    <ConfirmActionDialog
      icon={LockKeyholeOpenIcon}
      title={`¿Restaurar el acceso de ${user.name}?`}
      description="Va a poder volver a entrar con su correo y contraseña."
      confirmLabel="Restaurar acceso"
      pendingLabel="Restaurando…"
      successMessage="Acceso restaurado."
      isDestructive={false}
      action={() => restoreUserAccessAction(user.id)}
      onClose={onClose}
    />
  );
}
