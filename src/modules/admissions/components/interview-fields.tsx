"use client";

import type { ReactNode } from "react";

import { DateField } from "@/components/shared/date-field";
import { FIELD_CONTROL_CLASS_NAME } from "@/components/shared/form-styles";
import { RequiredFieldLabel } from "@/components/shared/required-field-label";
import {
  Field,
  FieldError,
  FieldLabel,
  FieldTitle,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import {
  CatalogOptionPicker,
  type CatalogSelectionMode,
} from "@/modules/catalogs/components";
import { cn } from "@/lib/utils";

import type { CatalogFieldData } from "../service";

const LABEL_CLASS_NAME = "text-base";
const YES_NO_ITEM_CLASS_NAME =
  "h-10 px-5 text-base data-[state=on]:border-primary data-[state=on]:bg-primary/10 data-[state=on]:font-semibold data-[state=on]:text-primary";
const YES_VALUE = "yes";
const NO_VALUE = "no";

function errorDescriptionId(id: string): string {
  return `${id}-error`;
}

function FieldFrame({
  id,
  label,
  isRequired,
  errors,
  className,
  children,
}: {
  id: string;
  label: string;
  isRequired: boolean;
  errors: string[] | undefined;
  className?: string;
  children: ReactNode;
}) {
  const Label = isRequired ? RequiredFieldLabel : FieldLabel;
  return (
    <Field data-invalid={errors ? true : undefined} className={className}>
      <Label htmlFor={id} className={LABEL_CLASS_NAME}>
        {label}
      </Label>
      {children}
      <FieldError
        id={errorDescriptionId(id)}
        errors={errors?.map((message) => ({ message }))}
      />
    </Field>
  );
}

export function TextField({
  id,
  label,
  value,
  onValueChange,
  maxLength,
  isRequired = false,
  isMultiline = false,
  errors,
  className,
  onBlur,
}: {
  id: string;
  label: string;
  value: string;
  onValueChange: (value: string) => void;
  maxLength: number;
  isRequired?: boolean;
  isMultiline?: boolean;
  errors: string[] | undefined;
  className?: string;
  onBlur?: () => void;
}) {
  const controlProps = {
    id,
    value,
    maxLength,
    required: isRequired,
    onBlur,
    "aria-invalid": errors ? true : undefined,
    "aria-describedby": errors ? errorDescriptionId(id) : undefined,
  };
  return (
    <FieldFrame
      id={id}
      label={label}
      isRequired={isRequired}
      errors={errors}
      className={className}
    >
      {isMultiline ? (
        <Textarea
          {...controlProps}
          onChange={(event) => onValueChange(event.target.value)}
          className="min-h-24 text-base md:text-base"
        />
      ) : (
        <Input
          {...controlProps}
          onChange={(event) => onValueChange(event.target.value)}
          className={FIELD_CONTROL_CLASS_NAME}
        />
      )}
    </FieldFrame>
  );
}

export function DateInputField({
  id,
  label,
  value,
  onValueChange,
  latestIsoDate,
  errors,
}: {
  id: string;
  label: string;
  value: string;
  onValueChange: (value: string) => void;
  latestIsoDate: string;
  errors: string[] | undefined;
}) {
  return (
    <FieldFrame id={id} label={label} isRequired errors={errors}>
      <DateField
        id={id}
        value={value}
        onValueChange={onValueChange}
        latestIsoDate={latestIsoDate}
        isInvalid={Boolean(errors)}
        describedBy={errors ? errorDescriptionId(id) : undefined}
      />
    </FieldFrame>
  );
}

export function OptionField({
  id,
  label,
  catalogField,
  selectionMode,
  value,
  onValueChange,
  isRequired = false,
  errors,
  className,
}: {
  id: string;
  label: string;
  catalogField: CatalogFieldData;
  selectionMode: CatalogSelectionMode;
  value: string[];
  onValueChange: (selectedIds: string[]) => void;
  isRequired?: boolean;
  errors: string[] | undefined;
  className?: string;
}) {
  return (
    <FieldFrame
      id={id}
      label={label}
      isRequired={isRequired}
      errors={errors}
      className={className}
    >
      <CatalogOptionPicker
        id={id}
        catalog={catalogField.catalog}
        options={catalogField.options}
        selectionMode={selectionMode}
        value={value}
        onValueChange={onValueChange}
        canCreate={catalogField.canCreate}
        isInvalid={Boolean(errors)}
      />
    </FieldFrame>
  );
}

export function YesNoField({
  id,
  label,
  value,
  onValueChange,
  className,
}: {
  id: string;
  label: string;
  value: boolean;
  onValueChange: (value: boolean) => void;
  className?: string;
}) {
  const labelId = `${id}-label`;
  return (
    <Field className={cn("gap-2", className)}>
      <FieldTitle id={labelId} className={LABEL_CLASS_NAME}>
        {label}
      </FieldTitle>
      <ToggleGroup
        type="single"
        variant="outline"
        aria-labelledby={labelId}
        value={value ? YES_VALUE : NO_VALUE}
        onValueChange={(nextValue) => {
          if (nextValue) {
            onValueChange(nextValue === YES_VALUE);
          }
        }}
      >
        <ToggleGroupItem value={YES_VALUE} className={YES_NO_ITEM_CLASS_NAME}>
          Sí
        </ToggleGroupItem>
        <ToggleGroupItem value={NO_VALUE} className={YES_NO_ITEM_CLASS_NAME}>
          No
        </ToggleGroupItem>
      </ToggleGroup>
    </Field>
  );
}
