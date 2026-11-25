"use client";

import { type FormEvent, useId, useState, useTransition } from "react";

import { DIALOG_BUTTON_CLASS_NAME } from "@/components/shared/form-styles";
import { RequiredFieldLabel } from "@/components/shared/required-field-label";
import { runAction } from "@/components/shared/run-action";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
} from "@/components/ui/field";
import { Textarea } from "@/components/ui/textarea";
import {
  ANNULMENT_REASON_LIMITS,
  type AnnulmentInput,
} from "@/platform/field-validation";
import type { ActionResult } from "@/platform/operation-result";

type FieldErrors = Record<string, string[] | undefined>;

function toFieldError(messages: string[] | undefined) {
  return messages?.map((message) => ({ message }));
}

export function AnnulmentDialog({
  title,
  description,
  submitLabel,
  successMessage,
  annul,
  onClose,
}: {
  title: string;
  description: string;
  submitLabel: string;
  successMessage: string;
  annul: (input: AnnulmentInput) => Promise<ActionResult>;
  onClose: () => void;
}) {
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [isAnnulling, startAnnulling] = useTransition();
  const formId = useId();
  const reasonFieldId = useId();
  const reasonHintId = useId();

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const reason = String(
      new FormData(event.currentTarget).get("reason") ?? "",
    );
    startAnnulling(async () => {
      const result = await runAction(() => annul({ reason }), successMessage);
      if (result?.status === "invalid") {
        setFieldErrors(result.fieldErrors);
      }
      if (result?.status === "success") {
        onClose();
      }
    });
  }

  return (
    <Dialog open onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-lg">{title}</DialogTitle>
          <DialogDescription className="text-base">
            {description}
          </DialogDescription>
        </DialogHeader>
        <form id={formId} onSubmit={submit} noValidate>
          <FieldGroup>
            <Field data-invalid={fieldErrors.reason ? true : undefined}>
              <RequiredFieldLabel htmlFor={reasonFieldId} className="text-base">
                Motivo
              </RequiredFieldLabel>
              <Textarea
                id={reasonFieldId}
                name="reason"
                required
                maxLength={ANNULMENT_REASON_LIMITS.maxLength}
                aria-describedby={reasonHintId}
                aria-invalid={fieldErrors.reason ? true : undefined}
                className="min-h-24 text-base md:text-base"
              />
              <FieldDescription id={reasonHintId}>
                Entre {ANNULMENT_REASON_LIMITS.minLength} y{" "}
                {ANNULMENT_REASON_LIMITS.maxLength} caracteres.
              </FieldDescription>
              <FieldError errors={toFieldError(fieldErrors.reason)} />
            </Field>
          </FieldGroup>
        </form>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline" className={DIALOG_BUTTON_CLASS_NAME}>
              Cancelar
            </Button>
          </DialogClose>
          <Button
            type="submit"
            form={formId}
            variant="destructive"
            disabled={isAnnulling}
            className={DIALOG_BUTTON_CLASS_NAME}
          >
            {isAnnulling ? "Anulando…" : submitLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
