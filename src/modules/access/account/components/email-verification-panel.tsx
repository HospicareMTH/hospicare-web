"use client";

import { CheckmarkCircle02Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { useRouter } from "next/navigation";
import { type FormEvent, useState } from "react";
import { toast } from "sonner";

import { RequiredFieldLabel } from "@/components/shared/required-field-label";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  DIALOG_BUTTON_CLASS_NAME,
  FIELD_CONTROL_CLASS_NAME,
} from "@/components/shared/form-styles";

import { authClient } from "../../auth/auth-client";
import {
  ACCOUNT_SECURITY_MESSAGES,
  describeAccountSecurityError,
} from "./account-security-messages";

const EMAIL_VERIFICATION_TYPE = "email-verification";

export function EmailVerificationPanel({
  email,
  isEmailVerified,
}: {
  email: string;
  isEmailVerified: boolean;
}) {
  const router = useRouter();
  const [isCodeSent, setIsCodeSent] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);

  if (isEmailVerified) {
    return (
      <p className="flex items-center gap-2 text-base">
        <HugeiconsIcon
          icon={CheckmarkCircle02Icon}
          className="size-5 shrink-0 text-section-green"
          aria-hidden="true"
        />
        <span>
          Tu correo <span className="font-medium break-all">{email}</span> está
          verificado.
        </span>
      </p>
    );
  }

  async function sendCode() {
    setIsSending(true);
    try {
      const { error } = await authClient.emailOtp.sendVerificationOtp({
        email,
        type: EMAIL_VERIFICATION_TYPE,
      });
      if (error) {
        toast.error(describeAccountSecurityError(error));
        return;
      }
      setIsCodeSent(true);
      toast.success("Te enviamos el código por correo.");
    } catch (error) {
      console.error("El código de verificación no pudo enviarse.", error);
      toast.error(ACCOUNT_SECURITY_MESSAGES.unavailable);
    } finally {
      setIsSending(false);
    }
  }

  async function verifyEmail(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const otp = String(new FormData(event.currentTarget).get("code")).trim();
    setIsVerifying(true);
    try {
      const { error } = await authClient.emailOtp.verifyEmail({ email, otp });
      if (error) {
        toast.error(describeAccountSecurityError(error));
        return;
      }
      toast.success("Tu correo quedó verificado.");
      router.refresh();
    } catch (error) {
      console.error("La verificación del correo no pudo completarse.", error);
      toast.error(ACCOUNT_SECURITY_MESSAGES.unavailable);
    } finally {
      setIsVerifying(false);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <p className="text-base">
        Verificá tu correo para poder activar el segundo factor. Te enviamos un
        código de 6 números a{" "}
        <span className="font-medium break-all">{email}</span>, que vence en 5
        minutos.
      </p>
      {isCodeSent ? (
        <form
          onSubmit={verifyEmail}
          className="flex max-w-sm flex-col gap-4"
          aria-label="Verificar el correo"
        >
          <Field>
            <RequiredFieldLabel htmlFor="email-verification-code">
              Código del correo
            </RequiredFieldLabel>
            <Input
              id="email-verification-code"
              name="code"
              inputMode="numeric"
              autoComplete="one-time-code"
              required
              autoFocus
              className={FIELD_CONTROL_CLASS_NAME}
            />
          </Field>
          <div className="flex flex-wrap gap-2">
            <Button
              type="submit"
              disabled={isVerifying}
              aria-busy={isVerifying}
              className={DIALOG_BUTTON_CLASS_NAME}
            >
              {isVerifying ? "Verificando…" : "Verificar"}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={sendCode}
              disabled={isSending}
              aria-busy={isSending}
              className={DIALOG_BUTTON_CLASS_NAME}
            >
              {isSending ? "Enviando…" : "Enviar otro código"}
            </Button>
          </div>
        </form>
      ) : (
        <Button
          type="button"
          onClick={sendCode}
          disabled={isSending}
          aria-busy={isSending}
          className={`${DIALOG_BUTTON_CLASS_NAME} self-start`}
        >
          {isSending ? "Enviando…" : "Enviar código"}
        </Button>
      )}
    </div>
  );
}
