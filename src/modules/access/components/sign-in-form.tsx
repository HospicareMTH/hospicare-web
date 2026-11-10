"use client";

import { useRouter } from "next/navigation";
import { type FormEvent, useState } from "react";
import { toast } from "sonner";

import { RequiredFieldLabel } from "@/components/shared/required-field-label";
import { Button } from "@/components/ui/button";
import { Field, FieldGroup } from "@/components/ui/field";
import { Input } from "@/components/ui/input";

import { authClient } from "../auth-client";
import { getSafeDestination } from "../redirect-destination";

const FIELD_CONTROL_CLASS_NAME =
  "h-11 rounded-none border-0 border-b bg-transparent px-1 caret-primary focus-visible:border-primary focus-visible:shadow-[inset_0_-1px_0_var(--primary)] focus-visible:ring-0 md:text-base dark:bg-transparent";
const FIELD_LABEL_CLASS_NAME = "text-sm text-muted-foreground";

const INVALID_CREDENTIALS_STATUS = 401;
const TOO_MANY_REQUESTS_STATUS = 429;

const SIGN_IN_ERROR_MESSAGES = {
  invalidCredentials: "El correo o la contraseña no son correctos.",
  tooManyAttempts:
    "Hiciste demasiados intentos. Esperá un minuto y volvé a probar.",
  unavailable: "No pudimos iniciar sesión. Probá de nuevo en unos minutos.",
};

function describeSignInError(status: number): string {
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
      const { error } = await authClient.signIn.email({
        email: String(formData.get("email")),
        password: String(formData.get("password")),
      });
      if (error) {
        toast.error(describeSignInError(error.status));
        setIsSubmitting(false);
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
            className={FIELD_LABEL_CLASS_NAME}
          >
            Correo electrónico
          </RequiredFieldLabel>
          <Input
            id="sign-in-email"
            name="email"
            type="email"
            autoComplete="username"
            required
            className={FIELD_CONTROL_CLASS_NAME}
          />
        </Field>
        <Field>
          <RequiredFieldLabel
            htmlFor="sign-in-password"
            className={FIELD_LABEL_CLASS_NAME}
          >
            Contraseña
          </RequiredFieldLabel>
          <Input
            id="sign-in-password"
            name="password"
            type="password"
            autoComplete="current-password"
            required
            className={FIELD_CONTROL_CLASS_NAME}
          />
        </Field>
        <Button
          type="submit"
          disabled={isSubmitting}
          aria-busy={isSubmitting}
          className="mt-6 h-12 w-full rounded-full text-base font-semibold shadow-[0_10px_24px_-8px_rgb(0_85_145/0.55)] dark:shadow-none"
        >
          {isSubmitting ? "Ingresando…" : "Ingresar"}
        </Button>
        <Button type="button" variant="link" className="h-11 text-base">
          ¿Olvidaste tu contraseña?
        </Button>
      </FieldGroup>
    </form>
  );
}
