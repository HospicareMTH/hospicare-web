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
import { Field, FieldError, FieldGroup } from "@/components/ui/field";
import { Input } from "@/components/ui/input";

import { createInvitationAction } from "../actions";
import type { RoleOption } from "../repository";
import { RoleSelectField } from "./role-select-field";
import { runAction } from "./run-action";
import { DIALOG_BUTTON_CLASS_NAME, FIELD_CONTROL_CLASS_NAME } from "./styles";

type FieldErrors = Record<string, string[] | undefined>;

const FORM_ID = "invite-form";

function toFieldError(messages: string[] | undefined) {
  return messages?.map((message) => ({ message }));
}

export function InviteDialog({
  roles,
  onClose,
}: {
  roles: RoleOption[];
  onClose: () => void;
}) {
  const [roleId, setRoleId] = useState("");
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [isSending, startSending] = useTransition();

  function invite(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const input = {
      name: String(formData.get("name") ?? ""),
      email: String(formData.get("email") ?? ""),
      roleId,
    };

    startSending(async () => {
      const result = await runAction(
        () => createInvitationAction(input),
        "Invitación enviada.",
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
          <DialogTitle className="text-lg">Invitar a una persona</DialogTitle>
          <DialogDescription className="text-base">
            Le llega un correo con un enlace para crear su contraseña. El enlace
            vence en 7 días.
          </DialogDescription>
        </DialogHeader>
        <form id={FORM_ID} onSubmit={invite} noValidate>
          <FieldGroup>
            <Field data-invalid={fieldErrors.name ? true : undefined}>
              <RequiredFieldLabel
                htmlFor="invitation-name"
                className="text-base"
              >
                Nombre
              </RequiredFieldLabel>
              <Input
                id="invitation-name"
                name="name"
                required
                autoComplete="off"
                aria-invalid={fieldErrors.name ? true : undefined}
                className={FIELD_CONTROL_CLASS_NAME}
                autoFocus
              />
              <FieldError errors={toFieldError(fieldErrors.name)} />
            </Field>
            <Field data-invalid={fieldErrors.email ? true : undefined}>
              <RequiredFieldLabel
                htmlFor="invitation-email"
                className="text-base"
              >
                Correo electrónico
              </RequiredFieldLabel>
              <Input
                id="invitation-email"
                name="email"
                type="email"
                required
                autoComplete="off"
                aria-invalid={fieldErrors.email ? true : undefined}
                className={FIELD_CONTROL_CLASS_NAME}
              />
              <FieldError errors={toFieldError(fieldErrors.email)} />
            </Field>
            <RoleSelectField
              id="invitation-role"
              roles={roles}
              value={roleId}
              onValueChange={setRoleId}
              errors={fieldErrors.roleId}
            />
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
            form={FORM_ID}
            disabled={isSending}
            className={DIALOG_BUTTON_CLASS_NAME}
          >
            {isSending ? "Enviando…" : "Enviar invitación"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
