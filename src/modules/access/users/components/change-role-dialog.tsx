"use client";

import { type FormEvent, useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { runAction } from "@/components/shared/run-action";
import { DIALOG_BUTTON_CLASS_NAME } from "@/components/shared/form-styles";

import { changeUserRoleAction } from "../actions";
import type { RoleOption } from "../../roles/repository";
import type { UserListItem } from "../service";
import { RoleSelectField } from "../../roles/components/role-select-field";

type FieldErrors = Record<string, string[] | undefined>;

const FORM_ID = "change-role-form";

export function ChangeRoleDialog({
  user,
  roles,
  onClose,
}: {
  user: UserListItem;
  roles: RoleOption[];
  onClose: () => void;
}) {
  const [roleId, setRoleId] = useState(
    roles.some((role) => role.id === user.roleId) ? (user.roleId ?? "") : "",
  );
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [isSaving, startSaving] = useTransition();

  function changeRole(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    startSaving(async () => {
      const result = await runAction(
        () => changeUserRoleAction(user.id, roleId),
        "Rol actualizado.",
      );
      if (result?.status === "invalid") {
        setFieldErrors(result.fieldErrors);
      }
      if (result?.status === "success") {
        onClose();
      }
    });
  }

  return (
    <Dialog open onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-lg">Cambiar rol</DialogTitle>
          <DialogDescription className="text-base">
            {user.name} pasa a tener los permisos del rol nuevo desde su próxima
            acción, sin volver a ingresar.
          </DialogDescription>
        </DialogHeader>
        <form id={FORM_ID} onSubmit={changeRole} noValidate>
          <RoleSelectField
            id="change-role-select"
            roles={roles}
            value={roleId}
            onValueChange={setRoleId}
            errors={fieldErrors.roleId}
          />
        </form>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline" className={DIALOG_BUTTON_CLASS_NAME}>
              Cancelar
            </Button>
          </DialogClose>
          <Button
            type="submit"
            form={FORM_ID}
            disabled={isSaving}
            className={DIALOG_BUTTON_CLASS_NAME}
          >
            {isSaving ? "Guardando…" : "Guardar rol"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
