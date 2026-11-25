"use client";

import { type FormEvent, useId, useState, useTransition } from "react";

import { errorDescriptionId } from "@/components/shared/form-fields";
import { DIALOG_BUTTON_CLASS_NAME } from "@/components/shared/form-styles";
import { RequiredFieldLabel } from "@/components/shared/required-field-label";
import { runAction } from "@/components/shared/run-action";
import { Button } from "@/components/ui/button";
import { Field, FieldDescription, FieldError } from "@/components/ui/field";
import { Textarea } from "@/components/ui/textarea";
import type { ActionResult } from "@/platform/operation-result";

import { DAILY_EVOLUTION_TEXT_LIMITS } from "../tables";

export function EvolutionTextForm({
  label,
  initialText = "",
  signature,
  submitLabel,
  pendingLabel,
  successMessage,
  save,
  onSaved,
  onCancel,
}: {
  label: string;
  initialText?: string;
  signature?: string;
  submitLabel: string;
  pendingLabel: string;
  successMessage: string;
  save: (input: { text: string }) => Promise<ActionResult>;
  onSaved?: () => void;
  onCancel?: () => void;
}) {
  const [text, setText] = useState(initialText);
  const [errors, setErrors] = useState<string[] | undefined>();
  const [isSaving, startSaving] = useTransition();
  const fieldId = useId();
  const hintId = useId();
  const signatureId = useId();

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    startSaving(async () => {
      const result = await runAction(() => save({ text }), successMessage);
      if (result?.status === "invalid") {
        setErrors(result.fieldErrors.text);
      }
      if (result?.status === "success") {
        setText("");
        setErrors(undefined);
        onSaved?.();
      }
    });
  }

  return (
    <form onSubmit={submit} noValidate className="flex flex-col gap-3">
      <Field data-invalid={errors ? true : undefined}>
        <RequiredFieldLabel htmlFor={fieldId} className="text-base">
          {label}
        </RequiredFieldLabel>
        <Textarea
          id={fieldId}
          value={text}
          onChange={(event) => {
            setText(event.target.value);
            setErrors(undefined);
          }}
          maxLength={DAILY_EVOLUTION_TEXT_LIMITS.maxLength}
          required
          aria-invalid={errors ? true : undefined}
          aria-describedby={[
            hintId,
            signature ? signatureId : null,
            errors ? errorDescriptionId(fieldId) : null,
          ]
            .filter((elementId) => elementId !== null)
            .join(" ")}
          className="min-h-32 text-base md:text-base"
        />
        <FieldDescription id={hintId}>
          Entre {DAILY_EVOLUTION_TEXT_LIMITS.minLength} y{" "}
          {DAILY_EVOLUTION_TEXT_LIMITS.maxLength} caracteres.
        </FieldDescription>
        <FieldError
          id={errorDescriptionId(fieldId)}
          errors={errors?.map((message) => ({ message }))}
        />
      </Field>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        {signature ? (
          <p id={signatureId} className="text-base text-muted-foreground">
            Se firma como{" "}
            <span className="font-medium text-foreground">{signature}</span>.
          </p>
        ) : (
          <span aria-hidden="true" />
        )}
        <div className="flex flex-col-reverse gap-2 sm:flex-row">
          {onCancel && (
            <Button
              type="button"
              variant="outline"
              onClick={onCancel}
              className={DIALOG_BUTTON_CLASS_NAME}
            >
              Cancelar
            </Button>
          )}
          <Button
            type="submit"
            disabled={isSaving}
            className={DIALOG_BUTTON_CLASS_NAME}
          >
            {isSaving ? pendingLabel : submitLabel}
          </Button>
        </div>
      </div>
    </form>
  );
}
