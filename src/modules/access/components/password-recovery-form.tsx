"use client";

import Link from "next/link";
import { type FormEvent, useState } from "react";
import { toast } from "sonner";

import { RequiredFieldLabel } from "@/components/shared/required-field-label";
import { Button } from "@/components/ui/button";
import { Field, FieldGroup } from "@/components/ui/field";
import { Input } from "@/components/ui/input";

import { authClient } from "../auth-client";
import { PASSWORD_RESET_PATH, SIGN_IN_PATH } from "../routes";
import {
  PUBLIC_FIELD_CONTROL_CLASS_NAME,
  PUBLIC_FIELD_LABEL_CLASS_NAME,
  PUBLIC_PRIMARY_BUTTON_CLASS_NAME,
} from "./styles";

const TOO_MANY_REQUESTS_STATUS = 429;

const PASSWORD_RECOVERY_MESSAGES = {
  sent: "Si ese correo tiene una cuenta, te enviamos un enlace para crear una contraseña nueva. Vence en 30 minutos.",
  tooManyAttempts:
    "Hiciste demasiados pedidos. Esperá una hora y volvé a probar.",
  unavailable: "No pudimos enviar el pedido. Probá de nuevo en unos minutos.",
};

export function PasswordRecoveryForm({ labelledBy }: { labelledBy: string }) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSent, setIsSent] = useState(false);

  async function requestPasswordReset(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    setIsSubmitting(true);

    try {
      const { error } = await authClient.requestPasswordReset({
        email: String(formData.get("email")),
        redirectTo: PASSWORD_RESET_PATH,
      });
      setIsSubmitting(false);
      if (error) {
        toast.error(
          error.status === TOO_MANY_REQUESTS_STATUS
            ? PASSWORD_RECOVERY_MESSAGES.tooManyAttempts
            : PASSWORD_RECOVERY_MESSAGES.unavailable,
        );
        return;
      }
    } catch (error) {
      console.error("El pedido de recuperación no pudo completarse.", error);
      toast.error(PASSWORD_RECOVERY_MESSAGES.unavailable);
      setIsSubmitting(false);
      return;
    }
    setIsSent(true);
  }

  if (isSent) {
    return (
      <>
        <p role="status" className="mt-8 text-center text-base text-foreground">
          {PASSWORD_RECOVERY_MESSAGES.sent}
        </p>
        <Button asChild className={PUBLIC_PRIMARY_BUTTON_CLASS_NAME}>
          <Link href={SIGN_IN_PATH}>Ir al inicio de sesión</Link>
        </Button>
      </>
    );
  }

  return (
    <form
      aria-labelledby={labelledBy}
      onSubmit={requestPasswordReset}
      className="mt-8"
    >
      <FieldGroup>
        <Field>
          <RequiredFieldLabel
            htmlFor="recovery-email"
            className={PUBLIC_FIELD_LABEL_CLASS_NAME}
          >
            Correo electrónico
          </RequiredFieldLabel>
          <Input
            id="recovery-email"
            name="email"
            type="email"
            autoComplete="username"
            required
            className={PUBLIC_FIELD_CONTROL_CLASS_NAME}
          />
        </Field>
        <Button
          type="submit"
          disabled={isSubmitting}
          aria-busy={isSubmitting}
          className={PUBLIC_PRIMARY_BUTTON_CLASS_NAME}
        >
          {isSubmitting ? "Enviando…" : "Enviar enlace"}
        </Button>
        <Button asChild variant="link" className="h-11 text-base">
          <Link href={SIGN_IN_PATH}>Volver al inicio de sesión</Link>
        </Button>
      </FieldGroup>
    </form>
  );
}
