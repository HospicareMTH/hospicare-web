"use client";

import { type FormEvent, useState, useTransition } from "react";

import { RequiredFieldLabel } from "@/components/shared/required-field-label";
import { Button } from "@/components/ui/button";
import { Field, FieldError } from "@/components/ui/field";
import { Input } from "@/components/ui/input";

import { updateOwnNameAction } from "../actions";

import { runAction } from "@/components/shared/run-action";
import {
  DIALOG_BUTTON_CLASS_NAME,
  FIELD_CONTROL_CLASS_NAME,
} from "@/components/shared/form-styles";

export function AccountNamePanel({
  name,
  isEmailVerified,
}: {
  name: string;
  isEmailVerified: boolean;
}) {
  const [nameErrors, setNameErrors] = useState<string[] | undefined>();
  const [isSaving, startSaving] = useTransition();

  if (!isEmailVerified) {
    return (
      <div className="flex flex-col gap-1">
        <p className="text-base font-medium">{name}</p>
        <p className="text-base text-muted-foreground">
          Verificá tu correo para poder cambiar tu nombre.
        </p>
      </div>
    );
  }

  function saveName(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const input = {
      name: String(new FormData(event.currentTarget).get("name") ?? ""),
    };
    startSaving(async () => {
      const result = await runAction(
        () => updateOwnNameAction(input),
        "Guardaste tu nombre.",
      );
      setNameErrors(
        result?.status === "invalid" ? result.fieldErrors.name : undefined,
      );
    });
  }

  return (
    <form
      onSubmit={saveName}
      noValidate
      className="flex max-w-sm flex-col gap-4"
      aria-label="Cambiar tu nombre"
    >
      <Field data-invalid={nameErrors ? true : undefined}>
        <RequiredFieldLabel htmlFor="account-name" className="text-base">
          Nombre
        </RequiredFieldLabel>
        <Input
          id="account-name"
          name="name"
          defaultValue={name}
          required
          autoComplete="name"
          aria-invalid={nameErrors ? true : undefined}
          className={FIELD_CONTROL_CLASS_NAME}
        />
        <FieldError errors={nameErrors?.map((message) => ({ message }))} />
      </Field>
      <Button
        type="submit"
        disabled={isSaving}
        aria-busy={isSaving}
        className={`${DIALOG_BUTTON_CLASS_NAME} self-start`}
      >
        {isSaving ? "Guardando…" : "Guardar nombre"}
      </Button>
    </form>
  );
}
