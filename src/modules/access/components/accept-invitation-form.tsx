"use client";

import { useRouter } from "next/navigation";
import { type FormEvent, useState, useTransition } from "react";

import { RequiredFieldLabel } from "@/components/shared/required-field-label";
import { Button } from "@/components/ui/button";
import { Field, FieldError, FieldGroup } from "@/components/ui/field";
import { Input } from "@/components/ui/input";

import { acceptInvitationAction } from "../actions";
import { SIGN_IN_PATH } from "../routes";
import { PASSWORD_MAX_LENGTH, PASSWORD_MIN_LENGTH } from "../schemas";
import { runAction } from "./run-action";
import {
  PUBLIC_FIELD_CONTROL_CLASS_NAME,
  PUBLIC_FIELD_LABEL_CLASS_NAME,
  PUBLIC_PRIMARY_BUTTON_CLASS_NAME,
} from "./styles";

type FieldErrors = Record<string, string[] | undefined>;

const ACCOUNT_READY_MESSAGE =
  "Tu cuenta está lista. Ingresá con tu correo y contraseña.";

function toFieldError(messages: string[] | undefined) {
  return messages?.map((message) => ({ message }));
}

export function AcceptInvitationForm({
  token,
  email,
  labelledBy,
}: {
  token: string;
  email: string;
  labelledBy: string;
}) {
  const router = useRouter();
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [isCreating, startCreating] = useTransition();

  function createAccount(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const input = {
      token,
      password: String(formData.get("password") ?? ""),
      passwordConfirmation: String(formData.get("passwordConfirmation") ?? ""),
    };

    startCreating(async () => {
      const result = await runAction(
        () => acceptInvitationAction(input),
        ACCOUNT_READY_MESSAGE,
      );
      if (result?.status === "invalid") {
        setFieldErrors(result.fieldErrors);
      }
      if (result?.status === "success") {
        router.replace(SIGN_IN_PATH);
      }
    });
  }

  return (
    <form aria-labelledby={labelledBy} onSubmit={createAccount} noValidate>
      <input
        type="email"
        name="username"
        value={email}
        autoComplete="username"
        readOnly
        hidden
      />
      <FieldGroup>
        <Field data-invalid={fieldErrors.password ? true : undefined}>
          <RequiredFieldLabel
            htmlFor="new-password"
            className={PUBLIC_FIELD_LABEL_CLASS_NAME}
          >
            Contraseña
          </RequiredFieldLabel>
          <Input
            id="new-password"
            name="password"
            type="password"
            autoComplete="new-password"
            required
            minLength={PASSWORD_MIN_LENGTH}
            maxLength={PASSWORD_MAX_LENGTH}
            aria-invalid={fieldErrors.password ? true : undefined}
            aria-describedby="new-password-hint"
            className={PUBLIC_FIELD_CONTROL_CLASS_NAME}
          />
          <p id="new-password-hint" className="text-sm text-muted-foreground">
            Al menos {PASSWORD_MIN_LENGTH} caracteres.
          </p>
          <FieldError errors={toFieldError(fieldErrors.password)} />
        </Field>
        <Field
          data-invalid={fieldErrors.passwordConfirmation ? true : undefined}
        >
          <RequiredFieldLabel
            htmlFor="password-confirmation"
            className={PUBLIC_FIELD_LABEL_CLASS_NAME}
          >
            Repetí la contraseña
          </RequiredFieldLabel>
          <Input
            id="password-confirmation"
            name="passwordConfirmation"
            type="password"
            autoComplete="new-password"
            required
            aria-invalid={fieldErrors.passwordConfirmation ? true : undefined}
            className={PUBLIC_FIELD_CONTROL_CLASS_NAME}
          />
          <FieldError errors={toFieldError(fieldErrors.passwordConfirmation)} />
        </Field>
        <Button
          type="submit"
          disabled={isCreating}
          aria-busy={isCreating}
          className={PUBLIC_PRIMARY_BUTTON_CLASS_NAME}
        >
          {isCreating ? "Creando tu cuenta…" : "Crear cuenta"}
        </Button>
      </FieldGroup>
    </form>
  );
}
