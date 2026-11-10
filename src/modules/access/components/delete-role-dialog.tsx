"use client";

import { Delete02Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { type MouseEvent, useTransition } from "react";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogMedia,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

import { deleteRoleAction } from "../actions";
import type { RoleListItem } from "../service";
import { runRoleAction } from "./run-role-action";
import { DIALOG_BUTTON_CLASS_NAME } from "./styles";

export function DeleteRoleDialog({
  role,
  onClose,
}: {
  role: RoleListItem;
  onClose: () => void;
}) {
  const [isDeleting, startDeleting] = useTransition();

  function deleteRole(event: MouseEvent<HTMLButtonElement>) {
    event.preventDefault();
    startDeleting(async () => {
      const result = await runRoleAction(
        () => deleteRoleAction(role.id),
        "Rol eliminado.",
      );
      if (result !== null) {
        onClose();
      }
    });
  }

  return (
    <AlertDialog open onOpenChange={(isOpen) => !isOpen && onClose()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogMedia className="bg-destructive/10 text-destructive">
            <HugeiconsIcon icon={Delete02Icon} aria-hidden="true" />
          </AlertDialogMedia>
          <AlertDialogTitle className="text-lg">
            ¿Eliminar el rol {role.name}?
          </AlertDialogTitle>
          <AlertDialogDescription className="text-base">
            Se borra junto con sus permisos y no se puede deshacer.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel className={DIALOG_BUTTON_CLASS_NAME}>
            Cancelar
          </AlertDialogCancel>
          <AlertDialogAction
            variant="destructive"
            onClick={deleteRole}
            disabled={isDeleting}
            className={DIALOG_BUTTON_CLASS_NAME}
          >
            {isDeleting ? "Eliminando…" : "Eliminar"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
