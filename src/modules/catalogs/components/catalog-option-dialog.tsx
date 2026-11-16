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
import { Textarea } from "@/components/ui/textarea";

import {
  createCatalogOptionAction,
  updateCatalogOptionAction,
} from "../actions";
import type { CatalogKey } from "../definitions";
import {
  OPTION_DESCRIPTION_MAX_LENGTH,
  OPTION_LABEL_MAX_LENGTH,
} from "../schemas";
import type { CatalogOptionListItem } from "../service";

type FieldErrors = Record<string, string[] | undefined>;

const FORM_ID = "catalog-option-form";

function toFieldError(messages: string[] | undefined) {
  return messages?.map((message) => ({ message }));
}

export function CatalogOptionDialog({
  catalogKey,
  catalogLabel,
  option,
  onClose,
}: {
  catalogKey: CatalogKey;
  catalogLabel: string;
  option: CatalogOptionListItem | null;
  onClose: () => void;
}) {
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [isSaving, startSaving] = useTransition();
  const isEditing = option !== null;

  function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const input = {
      label: String(formData.get("label") ?? ""),
      description: String(formData.get("description") ?? ""),
    };

    startSaving(async () => {
      const result = option
        ? await runAction(
            () => updateCatalogOptionAction(option.id, input),
            "Opción actualizada.",
          )
        : await runAction(
            () => createCatalogOptionAction(catalogKey, input),
            ({ wasReactivated }) =>
              wasReactivated
                ? "Esa opción ya existía y se volvió a activar."
                : "Opción creada.",
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
            {isEditing ? "Editar opción" : "Nueva opción"}
          </DialogTitle>
          <DialogDescription className="text-base">
            {catalogLabel}
          </DialogDescription>
        </DialogHeader>
        <form id={FORM_ID} onSubmit={save} noValidate>
          <FieldGroup>
            <Field data-invalid={fieldErrors.label ? true : undefined}>
              <RequiredFieldLabel
                htmlFor="catalog-option-label"
                className="text-base"
              >
                Nombre
              </RequiredFieldLabel>
              <Input
                id="catalog-option-label"
                name="label"
                required
                maxLength={OPTION_LABEL_MAX_LENGTH}
                defaultValue={option?.label}
                aria-invalid={fieldErrors.label ? true : undefined}
                className={FIELD_CONTROL_CLASS_NAME}
                autoFocus
              />
              <FieldError errors={toFieldError(fieldErrors.label)} />
            </Field>
            <Field data-invalid={fieldErrors.description ? true : undefined}>
              <FieldLabel
                htmlFor="catalog-option-description"
                className="text-base"
              >
                Descripción
              </FieldLabel>
              <Textarea
                id="catalog-option-description"
                name="description"
                maxLength={OPTION_DESCRIPTION_MAX_LENGTH}
                defaultValue={option?.description ?? ""}
                aria-invalid={fieldErrors.description ? true : undefined}
                className="min-h-24 text-base md:text-base"
              />
              <FieldError errors={toFieldError(fieldErrors.description)} />
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
            disabled={isSaving}
            className={DIALOG_BUTTON_CLASS_NAME}
          >
            {isSaving
              ? "Guardando…"
              : isEditing
                ? "Guardar cambios"
                : "Crear opción"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
