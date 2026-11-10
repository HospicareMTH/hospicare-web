"use client";

import { useRouter } from "next/navigation";
import { type FormEvent, useState } from "react";
import { toast } from "sonner";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { FieldGroup } from "@/components/ui/field";

import { authClient } from "../auth-client";
import { SIGN_IN_PATH } from "../routes";
import { newPasswordSchema } from "../schemas";
import { type FieldErrors, NewPasswordFields } from "./new-password-fields";
import { PASSWORD_RESET_MESSAGES } from "./password-reset-messages";
import { PUBLIC_PRIMARY_BUTTON_CLASS_NAME } from "./styles";

const TOO_MANY_REQUESTS_STATUS = 429;
const INVALID_TOKEN_ERROR_CODE = "INVALID_TOKEN";

function describeResetError({
  status,
  code,
}: {
  status: number;
  code?: string;
}): string {
  if (code === INVALID_TOKEN_ERROR_CODE) {
    return PASSWORD_RESET_MESSAGES.invalidLink;
  }
  if (status === TOO_MANY_REQUESTS_STATUS) {
    return PASSWORD_RESET_MESSAGES.tooManyAttempts;
  }
  return PASSWORD_RESET_MESSAGES.unavailable;
}

export function PasswordResetForm({
  token,
  labelledBy,
}: {
  token: string;
  labelledBy: string;
}) {
  const router = useRouter();
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function resetPassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const input = newPasswordSchema.safeParse({
      token,
      password: String(formData.get("password") ?? ""),
      passwordConfirmation: String(formData.get("passwordConfirmation") ?? ""),
    });
    if (!input.success) {
      setFieldErrors(z.flattenError(input.error).fieldErrors);
      return;
    }
    setFieldErrors({});
    setIsSubmitting(true);

    try {
      const { error } = await authClient.resetPassword({
        token: input.data.token,
        newPassword: input.data.password,
      });
      if (error) {
        toast.error(describeResetError(error));
        setIsSubmitting(false);
        return;
      }
    } catch (error) {
      console.error("El cambio de contraseña no pudo completarse.", error);
      toast.error(PASSWORD_RESET_MESSAGES.unavailable);
      setIsSubmitting(false);
      return;
    }

    toast.success(PASSWORD_RESET_MESSAGES.done);
    router.replace(SIGN_IN_PATH);
  }

  return (
    <form
      aria-labelledby={labelledBy}
      onSubmit={resetPassword}
      noValidate
      className="mt-8"
    >
      <FieldGroup>
        <NewPasswordFields fieldErrors={fieldErrors} />
        <Button
          type="submit"
          disabled={isSubmitting}
          aria-busy={isSubmitting}
          className={PUBLIC_PRIMARY_BUTTON_CLASS_NAME}
        >
          {isSubmitting ? "Guardando…" : "Guardar contraseña"}
        </Button>
      </FieldGroup>
    </form>
  );
}
