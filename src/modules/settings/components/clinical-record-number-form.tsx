"use client";

import { FileValidationIcon } from "@hugeicons/core-free-icons";
import { type FormEvent, useState } from "react";
import { toast } from "sonner";
import { z } from "zod";

import { ConfirmActionDialog } from "@/components/shared/confirm-action-dialog";
import {
  DIALOG_BUTTON_CLASS_NAME,
  FIELD_CONTROL_CLASS_NAME,
} from "@/components/shared/form-styles";
import { RequiredFieldLabel } from "@/components/shared/required-field-label";
import { Button } from "@/components/ui/button";
import { Field, FieldDescription, FieldError } from "@/components/ui/field";
import { Input } from "@/components/ui/input";

import { updateLastClinicalRecordNumberAction } from "../actions";
import {
  describeMinimumNumber,
  lastClinicalRecordNumberInputSchema,
} from "../schemas";

const FIELD_ID = "last-clinical-record-number";
const DESCRIPTION_ID = "last-clinical-record-number-description";

function describeNextNumber(lastAssignedNumber: number): string {
  return `El próximo huésped va a recibir el número ${lastAssignedNumber + 1}.`;
}

function ReadOnlyClinicalRecordNumber({
  lastAssignedNumber,
}: {
  lastAssignedNumber: number;
}) {
  return (
    <div className="flex flex-col gap-2">
      <dl className="flex flex-col gap-2">
        <dt className="text-base font-medium">Último número asignado</dt>
        <dd className="text-base tabular-nums">{lastAssignedNumber}</dd>
      </dl>
      <p className="text-base text-muted-foreground">
        {describeNextNumber(lastAssignedNumber)}
      </p>
    </div>
  );
}

export function ClinicalRecordNumberForm({
  lastAssignedNumber,
  canUpdate,
}: {
  lastAssignedNumber: number;
  canUpdate: boolean;
}) {
  const [fieldErrors, setFieldErrors] = useState<string[] | undefined>();
  const [numberToConfirm, setNumberToConfirm] = useState<number | null>(null);

  if (!canUpdate) {
    return (
      <ReadOnlyClinicalRecordNumber lastAssignedNumber={lastAssignedNumber} />
    );
  }

  function reviewNumber(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const parsedInput = lastClinicalRecordNumberInputSchema.safeParse({
      lastClinicalRecordNumber: String(
        new FormData(event.currentTarget).get("lastClinicalRecordNumber") ?? "",
      ),
    });
    if (!parsedInput.success) {
      setFieldErrors(
        z.flattenError(parsedInput.error).fieldErrors.lastClinicalRecordNumber,
      );
      return;
    }
    const { lastClinicalRecordNumber } = parsedInput.data;
    if (lastClinicalRecordNumber < lastAssignedNumber) {
      setFieldErrors([describeMinimumNumber(lastAssignedNumber)]);
      return;
    }
    setFieldErrors(undefined);
    if (lastClinicalRecordNumber === lastAssignedNumber) {
      toast.info(
        `El último número asignado ya es ${lastAssignedNumber}. No hubo cambios.`,
      );
      return;
    }
    setNumberToConfirm(lastClinicalRecordNumber);
  }

  async function saveNumber(confirmedNumber: number) {
    const result = await updateLastClinicalRecordNumberAction({
      lastClinicalRecordNumber: String(confirmedNumber),
    });
    if (result.status === "invalid") {
      setFieldErrors(result.fieldErrors.lastClinicalRecordNumber);
    }
    return result;
  }

  const hasErrors = fieldErrors !== undefined;

  return (
    <>
      <form
        onSubmit={reviewNumber}
        noValidate
        className="flex max-w-sm flex-col gap-4"
        aria-label="Cambiar el último número de historia clínica asignado"
      >
        <Field data-invalid={hasErrors ? true : undefined}>
          <RequiredFieldLabel htmlFor={FIELD_ID} className="text-base">
            Último número asignado
          </RequiredFieldLabel>
          <Input
            id={FIELD_ID}
            name="lastClinicalRecordNumber"
            key={lastAssignedNumber}
            defaultValue={String(lastAssignedNumber)}
            inputMode="numeric"
            autoComplete="off"
            required
            aria-describedby={DESCRIPTION_ID}
            aria-invalid={hasErrors ? true : undefined}
            className={`${FIELD_CONTROL_CLASS_NAME} tabular-nums`}
          />
          <FieldDescription id={DESCRIPTION_ID} className="text-base">
            {describeNextNumber(lastAssignedNumber)}
          </FieldDescription>
          <FieldError errors={fieldErrors?.map((message) => ({ message }))} />
        </Field>
        <Button
          type="submit"
          className={`${DIALOG_BUTTON_CLASS_NAME} self-start`}
        >
          Guardar número
        </Button>
      </form>
      {numberToConfirm !== null ? (
        <ConfirmActionDialog
          icon={FileValidationIcon}
          title={`¿Guardar el número ${numberToConfirm}?`}
          description={`El próximo huésped va a recibir el número ${numberToConfirm + 1}. Después no vas a poder volver a un número menor que ${numberToConfirm}.`}
          confirmLabel="Guardar número"
          pendingLabel="Guardando…"
          successMessage={`Guardaste el número ${numberToConfirm}.`}
          isDestructive={false}
          action={() => saveNumber(numberToConfirm)}
          onClose={() => setNumberToConfirm(null)}
        />
      ) : null}
    </>
  );
}
