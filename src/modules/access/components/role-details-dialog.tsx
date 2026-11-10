"use client";

import { type FormEvent, useState, useTransition } from "react";

import { RequiredFieldLabel } from "@/components/shared/required-field-label";
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
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

import { createRoleAction, updateRoleAction } from "../actions";
import { ROLE_DESCRIPTION_MAX_LENGTH, ROLE_NAME_MAX_LENGTH } from "../schemas";
import type { RoleListItem } from "../service";
import { runRoleAction } from "./run-role-action";
import { DIALOG_BUTTON_CLASS_NAME, FIELD_CONTROL_CLASS_NAME } from "./styles";

type FieldErrors = Record<string, string[] | undefined>;

function toFieldError(messages: string[] | undefined) {
  return messages?.map((message) => ({ message }));
}

export function RoleDetailsDialog({
  role,
  onClose,
}: {
  role: RoleListItem | null;
  onClose: () => void;
}) {
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [isSaving, startSaving] = useTransition();
  const isEditing = role !== null;

  function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const input = {
      name: String(formData.get("name") ?? ""),
      description: String(formData.get("description") ?? ""),
    };

    startSaving(async () => {
      const result = await runRoleAction(
        () =>
          role ? updateRoleAction(role.id, input) : createRoleAction(input),
        isEditing ? "Cambios guardados." : "Rol creado.",
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
          <DialogTitle className="text-lg">
            {isEditing ? "Editar rol" : "Nuevo rol"}
          </DialogTitle>
          <DialogDescription className="text-base">
            {isEditing
              ? "Cambiá el nombre o la descripción. Los permisos se editan aparte."
              : "El rol nace sin permisos. Después podés asignarle los que necesite."}
          </DialogDescription>
        </DialogHeader>
        <form id="role-details-form" onSubmit={save} noValidate>
          <FieldGroup>
            <Field data-invalid={fieldErrors.name ? true : undefined}>
              <RequiredFieldLabel htmlFor="role-name" className="text-base">
                Nombre
              </RequiredFieldLabel>
              <Input
                id="role-name"
                name="name"
                required
                maxLength={ROLE_NAME_MAX_LENGTH}
                defaultValue={role?.name}
                aria-invalid={fieldErrors.name ? true : undefined}
                className={FIELD_CONTROL_CLASS_NAME}
                autoFocus
              />
              <FieldError errors={toFieldError(fieldErrors.name)} />
            </Field>
            <Field data-invalid={fieldErrors.description ? true : undefined}>
              <FieldLabel htmlFor="role-description" className="text-base">
                Descripción
              </FieldLabel>
              <Textarea
                id="role-description"
                name="description"
                maxLength={ROLE_DESCRIPTION_MAX_LENGTH}
                defaultValue={role?.description ?? ""}
                aria-invalid={fieldErrors.description ? true : undefined}
                className="min-h-24 text-base md:text-base"
              />
              <FieldError errors={toFieldError(fieldErrors.description)} />
            </Field>
          </FieldGroup>
        </form>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline" className={DIALOG_BUTTON_CLASS_NAME}>
              Cancelar
            </Button>
          </DialogClose>
          <Button
            type="submit"
            form="role-details-form"
            disabled={isSaving}
            className={DIALOG_BUTTON_CLASS_NAME}
          >
            {isSaving
              ? "Guardando…"
              : isEditing
                ? "Guardar cambios"
                : "Crear rol"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
