"use client";

import { useRouter } from "next/navigation";
import { type FormEvent, useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { FieldGroup } from "@/components/ui/field";
import { runAction } from "@/components/shared/run-action";

import { acceptInvitationAction } from "../actions";
import { SIGN_IN_PATH } from "../../routes";
import {
  type FieldErrors,
  NewPasswordFields,
} from "../../auth/components/new-password-fields";
import { PUBLIC_PRIMARY_BUTTON_CLASS_NAME } from "../../auth/components/public-styles";

const ACCOUNT_READY_MESSAGE =
  "Tu cuenta está lista. Ingresá con tu correo y contraseña.";

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
        <NewPasswordFields fieldErrors={fieldErrors} />
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
