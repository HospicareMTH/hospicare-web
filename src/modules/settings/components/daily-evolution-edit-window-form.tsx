"use client";

import { type FormEvent, useState, useTransition } from "react";

import {
  ChoiceField,
  type ChoiceOption,
  errorDescriptionId,
  FieldFrame,
} from "@/components/shared/form-fields";
import {
  DIALOG_BUTTON_CLASS_NAME,
  FIELD_CONTROL_CLASS_NAME,
  SELECT_ITEM_CLASS_NAME,
  SELECT_TRIGGER_CLASS_NAME,
} from "@/components/shared/form-styles";
import { runAction } from "@/components/shared/run-action";
import { Button } from "@/components/ui/button";
import { FieldGroup } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import { updateDailyEvolutionEditWindowAction } from "../actions";
import {
  describeEditWindow,
  DURATION_MODE,
  EDIT_WINDOW_UNIT_LABELS,
  type EditWindow,
  type EditWindowInput,
  IMMEDIATE_LOCK_MODE,
} from "../schemas";
import { EDIT_WINDOW_UNITS, type EditWindowUnit } from "../tables";

type FieldErrors = Partial<Record<string, string[]>>;

const FORM_ID_PREFIX = "daily-evolution-edit-window";
const DEFAULT_DURATION = { amount: "24", unit: "hours" } as const;

const MODE_OPTIONS: readonly ChoiceOption[] = [
  { value: IMMEDIATE_LOCK_MODE, label: "Bloqueo inmediato" },
  { value: DURATION_MODE, label: "Durante un tiempo" },
];

function capitalize(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

function isEditWindowMode(
  candidate: string,
): candidate is EditWindowInput["mode"] {
  return candidate === IMMEDIATE_LOCK_MODE || candidate === DURATION_MODE;
}

function isEditWindowUnit(candidate: string): candidate is EditWindowUnit {
  return EDIT_WINDOW_UNITS.some((unit) => unit === candidate);
}

function toInput(editWindow: EditWindow): EditWindowInput {
  if (editWindow.mode === IMMEDIATE_LOCK_MODE) {
    return { mode: IMMEDIATE_LOCK_MODE, ...DEFAULT_DURATION };
  }
  return {
    mode: DURATION_MODE,
    amount: String(editWindow.amount),
    unit: editWindow.unit,
  };
}

function ReadOnlyEditWindow({ editWindow }: { editWindow: EditWindow }) {
  return (
    <dl className="flex flex-col gap-2">
      <dt className="text-base font-medium">Ventana de edición</dt>
      <dd className="text-base">{describeEditWindow(editWindow)}</dd>
    </dl>
  );
}

export function DailyEvolutionEditWindowForm({
  editWindow,
  canUpdate,
}: {
  editWindow: EditWindow;
  canUpdate: boolean;
}) {
  const [input, setInput] = useState(() => toInput(editWindow));
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [isSaving, startSaving] = useTransition();

  if (!canUpdate) {
    return <ReadOnlyEditWindow editWindow={editWindow} />;
  }

  function update<Field extends keyof EditWindowInput>(
    field: Field,
    value: EditWindowInput[Field],
  ) {
    setInput((current) => ({ ...current, [field]: value }));
    setFieldErrors((current) => ({ ...current, [field]: undefined }));
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    startSaving(async () => {
      const result = await runAction(
        () => updateDailyEvolutionEditWindowAction(input),
        "Guardaste la ventana de edición.",
      );
      if (result?.status === "invalid") {
        setFieldErrors(result.fieldErrors);
      }
    });
  }

  const amountId = `${FORM_ID_PREFIX}-amount`;
  const unitId = `${FORM_ID_PREFIX}-unit`;

  return (
    <form
      onSubmit={submit}
      noValidate
      className="flex max-w-xl flex-col gap-6"
      aria-label="Cambiar la ventana de edición de evoluciones diarias"
    >
      <FieldGroup>
        <ChoiceField
          id={`${FORM_ID_PREFIX}-mode`}
          label="Ventana de edición"
          options={MODE_OPTIONS}
          value={input.mode}
          onValueChange={(value) => {
            if (isEditWindowMode(value)) {
              update("mode", value);
            }
          }}
          isRequired
          errors={fieldErrors.mode}
          itemClassName="px-4"
        />
        {input.mode === DURATION_MODE && (
          <div className="grid gap-4 sm:grid-cols-2">
            <FieldFrame
              id={amountId}
              label="Cantidad"
              isRequired
              errors={fieldErrors.amount}
            >
              <Input
                id={amountId}
                value={input.amount}
                onChange={(event) => update("amount", event.target.value)}
                inputMode="numeric"
                autoComplete="off"
                required
                aria-invalid={fieldErrors.amount ? true : undefined}
                aria-describedby={
                  fieldErrors.amount ? errorDescriptionId(amountId) : undefined
                }
                className={`${FIELD_CONTROL_CLASS_NAME} tabular-nums`}
              />
            </FieldFrame>
            <FieldFrame
              id={unitId}
              label="Unidad"
              isRequired
              errors={fieldErrors.unit}
            >
              <Select
                value={input.unit}
                onValueChange={(value) => {
                  if (isEditWindowUnit(value)) {
                    update("unit", value);
                  }
                }}
              >
                <SelectTrigger
                  id={unitId}
                  className={`w-full ${SELECT_TRIGGER_CLASS_NAME}`}
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {EDIT_WINDOW_UNITS.map((unit) => (
                    <SelectItem
                      key={unit}
                      value={unit}
                      className={SELECT_ITEM_CLASS_NAME}
                    >
                      {capitalize(EDIT_WINDOW_UNIT_LABELS[unit].plural)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FieldFrame>
          </div>
        )}
      </FieldGroup>
      <Button
        type="submit"
        disabled={isSaving}
        className={`${DIALOG_BUTTON_CLASS_NAME} self-start`}
      >
        {isSaving ? "Guardando…" : "Guardar ventana"}
      </Button>
    </form>
  );
}
