"use client";

import { type FormEvent, useState, useTransition } from "react";

import { RequiredFieldLabel } from "@/components/shared/required-field-label";
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
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";

import { createUserAction } from "../actions";
import type { RoleOption } from "../repository";
import { PASSWORD_MIN_LENGTH } from "../schemas";
import { RoleSelectField } from "./role-select-field";
import { runAction } from "./run-action";
import { DIALOG_BUTTON_CLASS_NAME, FIELD_CONTROL_CLASS_NAME } from "./styles";

type FieldErrors = Record<string, string[] | undefined>;

const FORM_ID = "create-user-form";

const TEXT_FIELDS = [
  {
    name: "name",
    label: "Nombre",
    type: "text",
    autoComplete: "off",
    hint: null,
  },
  {
    name: "email",
    label: "Correo electrónico",
    type: "email",
    autoComplete: "off",
    hint: null,
  },
  {
    name: "password",
    label: "Contraseña inicial",
    type: "password",
    autoComplete: "new-password",
    hint: `Al menos ${PASSWORD_MIN_LENGTH} caracteres.`,
  },
  {
    name: "passwordConfirmation",
    label: "Repetí la contraseña",
    type: "password",
    autoComplete: "new-password",
    hint: null,
  },
] as const;

export function CreateUserDialog({
  roles,
  onClose,
}: {
  roles: RoleOption[];
  onClose: () => void;
}) {
  const [roleId, setRoleId] = useState("");
  const [isEmailVerified, setIsEmailVerified] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [isCreating, startCreating] = useTransition();

  function createUser(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const input = {
      name: String(formData.get("name") ?? ""),
      email: String(formData.get("email") ?? ""),
      password: String(formData.get("password") ?? ""),
      passwordConfirmation: String(formData.get("passwordConfirmation") ?? ""),
      roleId,
      isEmailVerified,
    };

    startCreating(async () => {
      const result = await runAction(
        () => createUserAction(input),
        "Usuario creado.",
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
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-lg">Crear usuario</DialogTitle>
          <DialogDescription className="text-base">
            La persona entra con este correo y la contraseña que definas.
            Siempre que se pueda, conviene invitarla para que elija su
            contraseña.
          </DialogDescription>
        </DialogHeader>
        <form id={FORM_ID} onSubmit={createUser} noValidate>
          <FieldGroup>
            {TEXT_FIELDS.map((field, index) => {
              const errors = fieldErrors[field.name];
              const id = `create-user-${field.name}`;
              return (
                <Field
                  key={field.name}
                  data-invalid={errors ? true : undefined}
                >
                  <RequiredFieldLabel htmlFor={id} className="text-base">
                    {field.label}
                  </RequiredFieldLabel>
                  <Input
                    id={id}
                    name={field.name}
                    type={field.type}
                    required
                    autoComplete={field.autoComplete}
                    autoFocus={index === 0}
                    aria-invalid={errors ? true : undefined}
                    aria-describedby={field.hint ? `${id}-hint` : undefined}
                    className={FIELD_CONTROL_CLASS_NAME}
                  />
                  {field.hint && (
                    <p
                      id={`${id}-hint`}
                      className="text-sm text-muted-foreground"
                    >
                      {field.hint}
                    </p>
                  )}
                  <FieldError
                    errors={errors?.map((message) => ({ message }))}
                  />
                </Field>
              );
            })}
            <RoleSelectField
              id="create-user-role"
              roles={roles}
              value={roleId}
              onValueChange={setRoleId}
              errors={fieldErrors.roleId}
            />
            <Field orientation="horizontal">
              <Checkbox
                id="create-user-email-verified"
                checked={isEmailVerified}
                onCheckedChange={(checked) =>
                  setIsEmailVerified(checked === true)
                }
              />
              <FieldLabel
                htmlFor="create-user-email-verified"
                className="text-base font-normal"
              >
                Correo verificado
              </FieldLabel>
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
            form={FORM_ID}
            disabled={isCreating}
            className={DIALOG_BUTTON_CLASS_NAME}
          >
            {isCreating ? "Creando…" : "Crear usuario"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
