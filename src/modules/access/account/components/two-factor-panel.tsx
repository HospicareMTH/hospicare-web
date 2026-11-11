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

import { createTotpQrCodeAction } from "../actions";
import { authClient } from "../../auth/auth-client";
import {
  ACCOUNT_SECURITY_MESSAGES,
  describeAccountSecurityError,
} from "./account-security-messages";

type PasswordPurpose = "enable" | "regenerate" | "disable";

type Step =
  | { kind: "idle" }
  | { kind: "password"; purpose: PasswordPurpose }
  | {
      kind: "scan";
      totpUri: string;
      qrCode: string | null;
      backupCodes: string[];
    }
  | { kind: "codes"; backupCodes: string[] };

const PASSWORD_SUBMIT_LABELS: Record<PasswordPurpose, string> = {
  enable: "Continuar",
  regenerate: "Generar códigos nuevos",
  disable: "Desactivar segundo factor",
};

const MANUAL_KEY_GROUP_PATTERN = /.{1,4}/g;

function formatManualKey(totpUri: string): string {
  const secret = new URL(totpUri).searchParams.get("secret") ?? "";
  return secret.match(MANUAL_KEY_GROUP_PATTERN)?.join(" ") ?? secret;
}

type ErrorResult = { error: { status: number; code?: string } | null };

function reportError({ error }: ErrorResult): boolean {
  if (!error) {
    return false;
  }
  toast.error(describeAccountSecurityError(error));
  return true;
}

function PasswordConfirmationForm({
  purpose,
  onConfirm,
  onCancel,
}: {
  purpose: PasswordPurpose;
  onConfirm: (password: string) => Promise<void>;
  onCancel: () => void;
}) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function confirm(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const password = String(new FormData(event.currentTarget).get("password"));
    setIsSubmitting(true);
    try {
      await onConfirm(password);
    } catch (error) {
      console.error(
        "La operación de segundo factor no pudo completarse.",
        error,
      );
      toast.error(ACCOUNT_SECURITY_MESSAGES.unavailable);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form
      onSubmit={confirm}
      className="flex max-w-sm flex-col gap-4"
      aria-label="Confirmar con tu contraseña"
    >
      <Field>
        <RequiredFieldLabel htmlFor="two-factor-password">
          Tu contraseña
        </RequiredFieldLabel>
        <Input
          id="two-factor-password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          autoFocus
          className={FIELD_CONTROL_CLASS_NAME}
        />
      </Field>
      <div className="flex flex-wrap gap-2">
        <Button
          type="submit"
          variant={purpose === "disable" ? "destructive" : "default"}
          disabled={isSubmitting}
          aria-busy={isSubmitting}
          className={DIALOG_BUTTON_CLASS_NAME}
        >
          {PASSWORD_SUBMIT_LABELS[purpose]}
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          className={DIALOG_BUTTON_CLASS_NAME}
        >
          Cancelar
        </Button>
      </div>
    </form>
  );
}

function BackupCodesList({
  backupCodes,
  onDone,
}: {
  backupCodes: string[];
  onDone: () => void;
}) {
  return (
    <div className="flex flex-col gap-4">
      <p className="text-base font-medium">
        Guardá estos códigos en un lugar seguro. Cada uno sirve una sola vez.
      </p>
      <ul
        aria-label="Códigos de respaldo"
        className="grid max-w-md grid-cols-2 gap-2 rounded-lg border bg-muted p-4 font-mono text-base tabular-nums"
      >
        {backupCodes.map((code) => (
          <li key={code}>{code}</li>
        ))}
      </ul>
      <Button
        type="button"
        onClick={onDone}
        className={`${DIALOG_BUTTON_CLASS_NAME} self-start`}
      >
        Ya los guardé
      </Button>
    </div>
  );
}

function AuthenticatorSetup({
  totpUri,
  qrCode,
  onConfirmed,
  onCancel,
}: {
  totpUri: string;
  qrCode: string | null;
  onConfirmed: () => void;
  onCancel: () => void;
}) {
  const [isConfirming, setIsConfirming] = useState(false);

  async function confirm(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const code = String(new FormData(event.currentTarget).get("code")).trim();
    setIsConfirming(true);
    try {
      if (reportError(await authClient.twoFactor.verifyTotp({ code }))) {
        return;
      }
      toast.success("Activaste el segundo factor.");
      onConfirmed();
    } catch (error) {
      console.error(
        "La activación del segundo factor no pudo completarse.",
        error,
      );
      toast.error(ACCOUNT_SECURITY_MESSAGES.unavailable);
    } finally {
      setIsConfirming(false);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <p className="text-base">
        Escaneá el código con tu aplicación autenticadora o escribí la clave a
        mano. Después ingresá el código de 6 números que te muestra.
      </p>
      <div className="flex flex-wrap items-center gap-6">
        {qrCode && (
          // eslint-disable-next-line @next/next/no-img-element -- es un SVG en línea generado en el servidor.
          <img
            src={qrCode}
            alt="Código QR para la aplicación autenticadora"
            className="size-48 rounded-lg border bg-white p-2"
          />
        )}
        <div className="flex flex-col gap-1">
          <span className="text-sm text-muted-foreground">Clave manual</span>
          <code className="font-mono text-base break-all select-all">
            {formatManualKey(totpUri)}
          </code>
        </div>
      </div>
      <form
        onSubmit={confirm}
        className="flex max-w-sm flex-col gap-4"
        aria-label="Confirmar la aplicación autenticadora"
      >
        <Field>
          <RequiredFieldLabel htmlFor="two-factor-setup-code">
            Código de la aplicación
          </RequiredFieldLabel>
          <Input
            id="two-factor-setup-code"
            name="code"
            inputMode="numeric"
            autoComplete="one-time-code"
            required
            className={FIELD_CONTROL_CLASS_NAME}
          />
        </Field>
        <div className="flex flex-wrap gap-2">
          <Button
            type="submit"
            disabled={isConfirming}
            aria-busy={isConfirming}
            className={DIALOG_BUTTON_CLASS_NAME}
          >
            {isConfirming ? "Confirmando…" : "Confirmar"}
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            className={DIALOG_BUTTON_CLASS_NAME}
          >
            Cancelar
          </Button>
        </div>
      </form>
    </div>
  );
}

export function TwoFactorPanel({
  isEmailVerified,
  isTwoFactorEnabled,
}: {
  isEmailVerified: boolean;
  isTwoFactorEnabled: boolean;
}) {
  const router = useRouter();
  const [step, setStep] = useState<Step>({ kind: "idle" });
  const backToIdle = () => setStep({ kind: "idle" });

  async function confirmWithPassword(
    purpose: PasswordPurpose,
    password: string,
  ) {
    if (purpose === "enable") {
      const result = await authClient.twoFactor.enable({
        password,
        method: "totp",
      });
      if (reportError(result) || result.data?.method !== "totp") {
        return;
      }
      setStep({
        kind: "scan",
        totpUri: result.data.totpURI,
        qrCode: await createTotpQrCodeAction(result.data.totpURI),
        backupCodes: result.data.backupCodes,
      });
      return;
    }
    if (purpose === "regenerate") {
      const result = await authClient.twoFactor.generateBackupCodes({
        password,
      });
      if (reportError(result) || !result.data) {
        return;
      }
      toast.success("Generaste códigos de respaldo nuevos.");
      setStep({ kind: "codes", backupCodes: result.data.backupCodes });
      return;
    }
    if (reportError(await authClient.twoFactor.disable({ password }))) {
      return;
    }
    toast.success("Desactivaste el segundo factor.");
    backToIdle();
    router.refresh();
  }

  if (step.kind === "password") {
    return (
      <PasswordConfirmationForm
        purpose={step.purpose}
        onConfirm={(password) => confirmWithPassword(step.purpose, password)}
        onCancel={backToIdle}
      />
    );
  }
  if (step.kind === "scan") {
    return (
      <AuthenticatorSetup
        totpUri={step.totpUri}
        qrCode={step.qrCode}
        onConfirmed={() => {
          setStep({ kind: "codes", backupCodes: step.backupCodes });
          router.refresh();
        }}
        onCancel={backToIdle}
      />
    );
  }
  if (step.kind === "codes") {
    return (
      <BackupCodesList backupCodes={step.backupCodes} onDone={backToIdle} />
    );
  }

  if (!isEmailVerified) {
    return (
      <p className="text-base text-muted-foreground">
        Primero verificá tu correo para poder activar el segundo factor.
      </p>
    );
  }

  if (!isTwoFactorEnabled) {
    return (
      <div className="flex flex-col gap-4">
        <p className="text-base">
          Además de la contraseña, al ingresar se te va a pedir un código de una
          aplicación autenticadora, un código por correo o un código de
          respaldo.
        </p>
        <Button
          type="button"
          onClick={() => setStep({ kind: "password", purpose: "enable" })}
          className={`${DIALOG_BUTTON_CLASS_NAME} self-start`}
        >
          Activar segundo factor
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <p className="flex items-center gap-2 text-base">
        <HugeiconsIcon
          icon={CheckmarkCircle02Icon}
          className="size-5 shrink-0 text-section-green"
          aria-hidden="true"
        />
        El segundo factor está activo.
      </p>
      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          variant="outline"
          onClick={() => setStep({ kind: "password", purpose: "regenerate" })}
          className={DIALOG_BUTTON_CLASS_NAME}
        >
          Generar códigos de respaldo nuevos
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={() => setStep({ kind: "password", purpose: "disable" })}
          className={`${DIALOG_BUTTON_CLASS_NAME} text-destructive`}
        >
          Desactivar segundo factor
        </Button>
      </div>
    </div>
  );
}
