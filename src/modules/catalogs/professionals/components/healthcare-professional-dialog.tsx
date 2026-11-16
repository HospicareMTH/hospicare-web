"use client";

import { type FormEvent, useState, useTransition } from "react";

import {
  DIALOG_BUTTON_CLASS_NAME,
  FIELD_CONTROL_CLASS_NAME,
} from "@/components/shared/form-styles";
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
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";

import {
  createHealthcareProfessionalAction,
  updateHealthcareProfessionalAction,
} from "../actions";
import { HEALTHCARE_PROFESSIONAL_TEXT_MAX_LENGTH } from "../field-limits";
import type { HealthcareProfessionalRecord } from "../repository";
import type { HealthcareProfessionalDetailsInput } from "../schemas";

type FieldErrors = Record<string, string[] | undefined>;

type OptionalField = Exclude<
  keyof HealthcareProfessionalDetailsInput,
  "fullName"
>;

const FORM_ID = "healthcare-professional-form";

const OPTIONAL_FIELDS: {
  name: OptionalField;
  label: string;
  type: "text" | "tel" | "email";
  maxLength?: number;
}[] = [
  {
    name: "specialty",
    label: "Especialidad",
    type: "text",
    maxLength: HEALTHCARE_PROFESSIONAL_TEXT_MAX_LENGTH,
  },
  {
    name: "licenseNumber",
    label: "Matrícula",
    type: "text",
    maxLength: HEALTHCARE_PROFESSIONAL_TEXT_MAX_LENGTH,
  },
  {
    name: "phone",
    label: "Teléfono",
    type: "tel",
    maxLength: HEALTHCARE_PROFESSIONAL_TEXT_MAX_LENGTH,
  },
  {
    name: "email",
    label: "Correo",
    type: "email",
  },
];

function toFieldError(messages: string[] | undefined) {
  return messages?.map((message) => ({ message }));
}

function readDetails(formData: FormData): HealthcareProfessionalDetailsInput {
  const readField = (name: keyof HealthcareProfessionalDetailsInput) =>
    String(formData.get(name) ?? "");
  return {
    fullName: readField("fullName"),
    specialty: readField("specialty"),
    licenseNumber: readField("licenseNumber"),
    phone: readField("phone"),
    email: readField("email"),
  };
}

export function HealthcareProfessionalDialog({
  professional,
  onClose,
}: {
  professional: HealthcareProfessionalRecord | null;
  onClose: () => void;
}) {
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [isSaving, startSaving] = useTransition();
  const isEditing = professional !== null;

  function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const details = readDetails(new FormData(event.currentTarget));

    startSaving(async () => {
      const result = professional
        ? await runAction(
            () => updateHealthcareProfessionalAction(professional.id, details),
            "Profesional actualizado.",
          )
        : await runAction(
            () => createHealthcareProfessionalAction(details),
            ({ wasReactivated }) =>
              wasReactivated
                ? "Ese correo era de un profesional inactivo: se volvió a activar con estos datos."
                : "Profesional creado.",
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
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-lg">
            {isEditing ? "Editar profesional" : "Nuevo profesional"}
          </DialogTitle>
          <DialogDescription className="text-base">
            El correo vincula al profesional con su cuenta para firmar.
          </DialogDescription>
        </DialogHeader>
        <form id={FORM_ID} onSubmit={save} noValidate>
          <FieldGroup>
            <Field data-invalid={fieldErrors.fullName ? true : undefined}>
              <RequiredFieldLabel
                htmlFor="healthcare-professional-fullName"
                className="text-base"
              >
                Nombre
              </RequiredFieldLabel>
              <Input
                id="healthcare-professional-fullName"
                name="fullName"
                required
                maxLength={HEALTHCARE_PROFESSIONAL_TEXT_MAX_LENGTH}
                defaultValue={professional?.fullName}
                aria-invalid={fieldErrors.fullName ? true : undefined}
                className={FIELD_CONTROL_CLASS_NAME}
                autoComplete="off"
                autoFocus
              />
              <FieldError errors={toFieldError(fieldErrors.fullName)} />
            </Field>
            {OPTIONAL_FIELDS.map((field) => {
              const inputId = `healthcare-professional-${field.name}`;
              const errors = fieldErrors[field.name];
              return (
                <Field
                  key={field.name}
                  data-invalid={errors ? true : undefined}
                >
                  <FieldLabel htmlFor={inputId} className="text-base">
                    {field.label}
                  </FieldLabel>
                  <Input
                    id={inputId}
                    name={field.name}
                    type={field.type}
                    maxLength={field.maxLength}
                    defaultValue={professional?.[field.name] ?? ""}
                    aria-invalid={errors ? true : undefined}
                    className={FIELD_CONTROL_CLASS_NAME}
                    autoComplete="off"
                  />
                  <FieldError errors={toFieldError(errors)} />
                </Field>
              );
            })}
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
            disabled={isSaving}
            className={DIALOG_BUTTON_CLASS_NAME}
          >
            {isSaving
              ? "Guardando…"
              : isEditing
                ? "Guardar cambios"
                : "Crear profesional"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
