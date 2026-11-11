"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { type FormEvent, useState } from "react";
import { toast } from "sonner";

import { RequiredFieldLabel } from "@/components/shared/required-field-label";
import { Button } from "@/components/ui/button";
import { Field, FieldGroup } from "@/components/ui/field";
import { Input } from "@/components/ui/input";

import { authClient } from "../auth-client";
import { getSafeDestination } from "../redirect-destination";
import { PASSWORD_RECOVERY_PATH, TWO_FACTOR_PATH } from "../../routes";
import { ACCESS_REVOKED_ERROR_CODE } from "../schemas";
import {
  PUBLIC_FIELD_CONTROL_CLASS_NAME,
  PUBLIC_FIELD_LABEL_CLASS_NAME,
  PUBLIC_PRIMARY_BUTTON_CLASS_NAME,
} from "./public-styles";

const INVALID_CREDENTIALS_STATUS = 401;
const TOO_MANY_REQUESTS_STATUS = 429;

const SIGN_IN_ERROR_MESSAGES = {
  invalidCredentials: "El correo o la contraseña no son correctos.",
  accessRevoked: "Tu acceso está suspendido. Contactá a un administrador.",
  tooManyAttempts:
    "Hiciste demasiados intentos. Esperá un minuto y volvé a probar.",
  unavailable: "No pudimos iniciar sesión. Probá de nuevo en unos minutos.",
};

function describeSignInError({
  status,
  code,
}: {
  status: number;
  code?: string;
}): string {
  if (code === ACCESS_REVOKED_ERROR_CODE) {
    return SIGN_IN_ERROR_MESSAGES.accessRevoked;
  }
  if (status === INVALID_CREDENTIALS_STATUS) {
    return SIGN_IN_ERROR_MESSAGES.invalidCredentials;
  }
  if (status === TOO_MANY_REQUESTS_STATUS) {
    return SIGN_IN_ERROR_MESSAGES.tooManyAttempts;
  }
  return SIGN_IN_ERROR_MESSAGES.unavailable;
}

export function SignInForm({ labelledBy }: { labelledBy: string }) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function signIn(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    setIsSubmitting(true);

    try {
      const { data, error } = await authClient.signIn.email({
        email: String(formData.get("email")),
        password: String(formData.get("password")),
      });
      if (error) {
        toast.error(describeSignInError(error));
        setIsSubmitting(false);
        return;
      }
      if (data && "twoFactorRedirect" in data) {
        router.replace(`${TWO_FACTOR_PATH}${window.location.search}`);
        return;
      }
    } catch (error) {
      console.error("El inicio de sesión no pudo completarse.", error);
      toast.error(SIGN_IN_ERROR_MESSAGES.unavailable);
      setIsSubmitting(false);
      return;
    }

    router.replace(getSafeDestination(window.location.search));
    router.refresh();
  }

  return (
    <form aria-labelledby={labelledBy} onSubmit={signIn}>
      <FieldGroup>
        <Field>
          <RequiredFieldLabel
            htmlFor="sign-in-email"
            className={PUBLIC_FIELD_LABEL_CLASS_NAME}
          >
            Correo electrónico
          </RequiredFieldLabel>
          <Input
            id="sign-in-email"
            name="email"
            type="email"
            autoComplete="username"
            required
            className={PUBLIC_FIELD_CONTROL_CLASS_NAME}
          />
        </Field>
        <Field>
          <RequiredFieldLabel
            htmlFor="sign-in-password"
            className={PUBLIC_FIELD_LABEL_CLASS_NAME}
          >
            Contraseña
          </RequiredFieldLabel>
          <Input
            id="sign-in-password"
            name="password"
            type="password"
            autoComplete="current-password"
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
          {isSubmitting ? "Ingresando…" : "Ingresar"}
        </Button>
        <Button asChild variant="link" className="h-11 text-base">
          <Link href={PASSWORD_RECOVERY_PATH}>¿Olvidaste tu contraseña?</Link>
        </Button>
      </FieldGroup>
    </form>
  );
}
