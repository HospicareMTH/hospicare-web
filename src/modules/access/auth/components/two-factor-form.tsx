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
import { SIGN_IN_PATH } from "../../routes";
import {
  PUBLIC_FIELD_CONTROL_CLASS_NAME,
  PUBLIC_FIELD_LABEL_CLASS_NAME,
  PUBLIC_PRIMARY_BUTTON_CLASS_NAME,
} from "./public-styles";

type VerificationMethod = "app" | "email" | "backup";

const TOO_MANY_REQUESTS_STATUS = 429;
const EXPIRED_SIGN_IN_ERROR_CODE = "INVALID_TWO_FACTOR_COOKIE";

const METHODS: Record<
  VerificationMethod,
  { label: string; codeLabel: string; hint: string }
> = {
  app: {
    label: "Aplicación",
    codeLabel: "Código de la aplicación",
    hint: "Abrí tu aplicación autenticadora y escribí el código de 6 números.",
  },
  email: {
    label: "Código por correo",
    codeLabel: "Código del correo",
    hint: "Te enviamos un código de 6 números. Vence en 3 minutos.",
  },
  backup: {
    label: "Código de respaldo",
    codeLabel: "Código de respaldo",
    hint: "Escribí uno de los códigos que guardaste. Cada uno sirve una sola vez.",
  },
};

const TWO_FACTOR_MESSAGES = {
  invalidCode: "El código no es correcto o ya venció.",
  expiredSignIn: "Tu ingreso venció. Volvé a iniciar sesión.",
  tooManyAttempts:
    "Hiciste demasiados intentos. Esperá un minuto y volvé a probar.",
  unavailable:
    "No pudimos verificar el código. Probá de nuevo en unos minutos.",
  emailSent: "Te enviamos el código por correo.",
  emailUnavailable:
    "No pudimos enviar el código. Probá de nuevo en unos minutos.",
};

function describeVerificationError({
  status,
  code,
}: {
  status: number;
  code?: string;
}): string {
  if (code === EXPIRED_SIGN_IN_ERROR_CODE) {
    return TWO_FACTOR_MESSAGES.expiredSignIn;
  }
  if (status === TOO_MANY_REQUESTS_STATUS) {
    return TWO_FACTOR_MESSAGES.tooManyAttempts;
  }
  if (status < 500) {
    return TWO_FACTOR_MESSAGES.invalidCode;
  }
  return TWO_FACTOR_MESSAGES.unavailable;
}

function verifyCode(method: VerificationMethod, code: string) {
  if (method === "app") {
    return authClient.twoFactor.verifyTotp({ code });
  }
  if (method === "email") {
    return authClient.twoFactor.verifyOtp({ code });
  }
  return authClient.twoFactor.verifyBackupCode({ code });
}

export function TwoFactorForm({ labelledBy }: { labelledBy: string }) {
  const router = useRouter();
  const [method, setMethod] = useState<VerificationMethod>("app");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSendingEmail, setIsSendingEmail] = useState(false);

  async function sendEmailCode() {
    setIsSendingEmail(true);
    try {
      const { error } = await authClient.twoFactor.sendOtp();
      if (error) {
        toast.error(describeVerificationError(error));
        return;
      }
      toast.success(TWO_FACTOR_MESSAGES.emailSent);
    } catch (error) {
      console.error("El código por correo no pudo enviarse.", error);
      toast.error(TWO_FACTOR_MESSAGES.emailUnavailable);
    } finally {
      setIsSendingEmail(false);
    }
  }

  function chooseMethod(nextMethod: VerificationMethod) {
    setMethod(nextMethod);
    if (nextMethod === "email") {
      void sendEmailCode();
    }
  }

  async function verify(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const code = String(new FormData(event.currentTarget).get("code")).trim();
    setIsSubmitting(true);

    try {
      const { error } = await verifyCode(method, code);
      if (error) {
        toast.error(describeVerificationError(error));
        setIsSubmitting(false);
        return;
      }
    } catch (error) {
      console.error("La verificación no pudo completarse.", error);
      toast.error(TWO_FACTOR_MESSAGES.unavailable);
      setIsSubmitting(false);
      return;
    }

    router.replace(getSafeDestination(window.location.search));
    router.refresh();
  }

  const { codeLabel, hint } = METHODS[method];
  const otherMethods = (Object.keys(METHODS) as VerificationMethod[]).filter(
    (candidate) => candidate !== method,
  );

  return (
    <form
      aria-labelledby={labelledBy}
      onSubmit={verify}
      className="mt-8"
      key={method}
    >
      <FieldGroup>
        <Field>
          <RequiredFieldLabel
            htmlFor="two-factor-code"
            className={PUBLIC_FIELD_LABEL_CLASS_NAME}
          >
            {codeLabel}
          </RequiredFieldLabel>
          <Input
            id="two-factor-code"
            name="code"
            inputMode={method === "backup" ? "text" : "numeric"}
            autoComplete="one-time-code"
            required
            autoFocus
            aria-describedby="two-factor-hint"
            className={PUBLIC_FIELD_CONTROL_CLASS_NAME}
          />
          <p id="two-factor-hint" className="text-sm text-muted-foreground">
            {hint}
          </p>
        </Field>
        {method === "email" && (
          <Button
            type="button"
            variant="outline"
            onClick={sendEmailCode}
            disabled={isSendingEmail}
            aria-busy={isSendingEmail}
            className="h-11 text-base"
          >
            {isSendingEmail ? "Enviando…" : "Enviar otro código"}
          </Button>
        )}
        <Button
          type="submit"
          disabled={isSubmitting}
          aria-busy={isSubmitting}
          className={PUBLIC_PRIMARY_BUTTON_CLASS_NAME}
        >
          {isSubmitting ? "Verificando…" : "Verificar"}
        </Button>
        <div className="flex flex-col items-center">
          {otherMethods.map((candidate) => (
            <Button
              key={candidate}
              type="button"
              variant="link"
              onClick={() => chooseMethod(candidate)}
              className="h-11 text-base"
            >
              Usar {METHODS[candidate].label.toLowerCase()}
            </Button>
          ))}
          <Button asChild variant="link" className="h-11 text-base">
            <Link href={SIGN_IN_PATH}>Volver al inicio de sesión</Link>
          </Button>
        </div>
      </FieldGroup>
    </form>
  );
}
