"use client";

import { type FormEvent, useState, useTransition } from "react";

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

import { annulAdmissionInterviewAction } from "../actions";
import { ANNULMENT_REASON_LIMITS } from "../schemas";

type FieldErrors = Record<string, string[] | undefined>;

const FORM_ID = "annul-interview-form";
const REASON_FIELD_ID = "annulment-reason";
const REASON_HINT_ID = "annulment-reason-hint";

function toFieldError(messages: string[] | undefined) {
  return messages?.map((message) => ({ message }));
}

export function AnnulInterviewDialog({
  interviewId,
  guestFullName,
  onClose,
}: {
  interviewId: string;
  guestFullName: string;
  onClose: () => void;
}) {
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [isAnnulling, startAnnulling] = useTransition();

  function annul(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const reason = String(
      new FormData(event.currentTarget).get("reason") ?? "",
    );
    startAnnulling(async () => {
      const result = await runAction(
        () => annulAdmissionInterviewAction(interviewId, { reason }),
        "Entrevista anulada.",
      );
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
          <DialogTitle className="text-lg">
            Anular la entrevista de {guestFullName}
          </DialogTitle>
          <DialogDescription className="text-base">
            Sale del listado y ya no se va a poder modificar. No se borra:
            quedan registrados quién la anuló, cuándo y el motivo. No se puede
            deshacer.
          </DialogDescription>
        </DialogHeader>
        <form id={FORM_ID} onSubmit={annul} noValidate>
          <FieldGroup>
            <Field data-invalid={fieldErrors.reason ? true : undefined}>
              <RequiredFieldLabel
                htmlFor={REASON_FIELD_ID}
                className="text-base"
              >
                Motivo
              </RequiredFieldLabel>
              <Textarea
                id={REASON_FIELD_ID}
                name="reason"
                required
                maxLength={ANNULMENT_REASON_LIMITS.maxLength}
                aria-describedby={REASON_HINT_ID}
                aria-invalid={fieldErrors.reason ? true : undefined}
                className="min-h-24 text-base md:text-base"
              />
              <FieldDescription id={REASON_HINT_ID}>
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
            form={FORM_ID}
            variant="destructive"
            disabled={isAnnulling}
            className={DIALOG_BUTTON_CLASS_NAME}
          >
            {isAnnulling ? "Anulando…" : "Anular entrevista"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
