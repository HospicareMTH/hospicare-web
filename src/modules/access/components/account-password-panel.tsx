"use client";

import { type FormEvent, useState } from "react";
import { toast } from "sonner";
import { z } from "zod";

import { RequiredFieldLabel } from "@/components/shared/required-field-label";
import { Button } from "@/components/ui/button";
import { Field, FieldError } from "@/components/ui/field";
import { Input } from "@/components/ui/input";

import { authClient } from "../auth-client";
import { PASSWORD_MIN_LENGTH, passwordChangeSchema } from "../schemas";
import {
  ACCOUNT_SECURITY_MESSAGES,
  describeAccountSecurityError,
} from "./account-security-messages";
import { DIALOG_BUTTON_CLASS_NAME, FIELD_CONTROL_CLASS_NAME } from "./styles";

type FieldErrors = Record<string, string[] | undefined>;

const PASSWORD_FIELDS = [
  {
    name: "currentPassword",
    label: "Contraseña actual",
    autoComplete: "current-password",
    hint: null,
  },
  {
    name: "password",
    label: "Contraseña nueva",
    autoComplete: "new-password",
    hint: `Al menos ${PASSWORD_MIN_LENGTH} caracteres.`,
  },
  {
    name: "passwordConfirmation",
    label: "Repetí la contraseña nueva",
    autoComplete: "new-password",
    hint: null,
  },
] as const;

export function AccountPasswordPanel({
  isEmailVerified,
}: {
  isEmailVerified: boolean;
}) {
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [isSaving, setIsSaving] = useState(false);

  if (!isEmailVerified) {
    return (
      <p className="text-base text-muted-foreground">
        Verificá tu correo para poder cambiar tu contraseña.
      </p>
    );
  }

  async function changePassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const formData = new FormData(form);
    const input = passwordChangeSchema.safeParse({
      currentPassword: String(formData.get("currentPassword") ?? ""),
      password: String(formData.get("password") ?? ""),
      passwordConfirmation: String(formData.get("passwordConfirmation") ?? ""),
    });
    if (!input.success) {
      setFieldErrors(z.flattenError(input.error).fieldErrors);
      return;
    }
    setFieldErrors({});
    setIsSaving(true);

    try {
      const { error } = await authClient.changePassword({
        currentPassword: input.data.currentPassword,
        newPassword: input.data.password,
        revokeOtherSessions: true,
      });
      if (error) {
        toast.error(describeAccountSecurityError(error));
        return;
      }
      toast.success("Cambiaste tu contraseña. Cerramos tus otras sesiones.");
      form.reset();
    } catch (error) {
      console.error("El cambio de contraseña no pudo completarse.", error);
      toast.error(ACCOUNT_SECURITY_MESSAGES.unavailable);
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <form
      onSubmit={changePassword}
      noValidate
      className="flex max-w-sm flex-col gap-4"
      aria-label="Cambiar tu contraseña"
    >
      {PASSWORD_FIELDS.map((field) => {
        const errors = fieldErrors[field.name];
        const id = `account-${field.name}`;
        return (
          <Field key={field.name} data-invalid={errors ? true : undefined}>
            <RequiredFieldLabel htmlFor={id} className="text-base">
              {field.label}
            </RequiredFieldLabel>
            <Input
              id={id}
              name={field.name}
              type="password"
              required
              autoComplete={field.autoComplete}
              aria-invalid={errors ? true : undefined}
              aria-describedby={field.hint ? `${id}-hint` : undefined}
              className={FIELD_CONTROL_CLASS_NAME}
            />
            {field.hint && (
              <p id={`${id}-hint`} className="text-sm text-muted-foreground">
                {field.hint}
              </p>
            )}
            <FieldError errors={errors?.map((message) => ({ message }))} />
          </Field>
        );
      })}
      <Button
        type="submit"
        disabled={isSaving}
        aria-busy={isSaving}
        className={`${DIALOG_BUTTON_CLASS_NAME} self-start`}
      >
        {isSaving ? "Guardando…" : "Cambiar contraseña"}
      </Button>
    </form>
  );
}
