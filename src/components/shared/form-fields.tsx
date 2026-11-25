"use client";

import type { ReactNode } from "react";

import { DateField } from "@/components/shared/date-field";
import { FIELD_CONTROL_CLASS_NAME } from "@/components/shared/form-styles";
import {
  RequiredFieldLabel,
  RequiredMark,
} from "@/components/shared/required-field-label";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldLabel,
  FieldTitle,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { cn } from "@/lib/utils";

const LABEL_CLASS_NAME = "text-base";

export const INVALID_FORM_MESSAGE =
  "Hay datos para corregir. Revisá los campos marcados.";
const CHOICE_ITEM_CLASS_NAME =
  "h-10 text-base data-[state=on]:border-primary data-[state=on]:bg-primary/10 data-[state=on]:font-semibold data-[state=on]:text-primary";
const YES_VALUE = "yes";
const NO_VALUE = "no";

export function errorDescriptionId(id: string): string {
  return `${id}-error`;
}

export function FieldFrame({
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
  isRequired = true,
  errors,
}: {
  id: string;
  label: string;
  value: string;
  onValueChange: (value: string) => void;
  latestIsoDate: string;
  isRequired?: boolean;
  errors: string[] | undefined;
}) {
  return (
    <FieldFrame id={id} label={label} isRequired={isRequired} errors={errors}>
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

export type ChoiceOption = {
  value: string;
  label: ReactNode;
  accessibleLabel?: string;
};

export function ChoiceField({
  id,
  label,
  description,
  options,
  value,
  onValueChange,
  isRequired = false,
  errors,
  className,
  groupClassName,
  itemClassName,
}: {
  id: string;
  label: string;
  description?: string;
  options: readonly ChoiceOption[];
  value: string;
  onValueChange: (value: string) => void;
  isRequired?: boolean;
  errors?: string[];
  className?: string;
  groupClassName?: string;
  itemClassName?: string;
}) {
  const labelId = `${id}-label`;
  const descriptionId = `${id}-description`;
  const describedBy = [
    description ? descriptionId : null,
    errors ? errorDescriptionId(id) : null,
  ].filter((elementId) => elementId !== null);
  return (
    <Field
      data-invalid={errors ? true : undefined}
      className={cn("gap-2", className)}
    >
      <FieldTitle id={labelId} className={LABEL_CLASS_NAME}>
        {label}
        {isRequired && <RequiredMark />}
      </FieldTitle>
      {description && (
        <FieldDescription id={descriptionId} className={LABEL_CLASS_NAME}>
          {description}
        </FieldDescription>
      )}
      <ToggleGroup
        type="single"
        variant="outline"
        aria-labelledby={labelId}
        aria-describedby={
          describedBy.length > 0 ? describedBy.join(" ") : undefined
        }
        aria-invalid={errors ? true : undefined}
        value={value}
        onValueChange={(nextValue) => {
          if (nextValue) {
            onValueChange(nextValue);
          }
        }}
        className={cn("flex-wrap", groupClassName)}
      >
        {options.map((option) => (
          <ToggleGroupItem
            key={option.value}
            value={option.value}
            aria-label={option.accessibleLabel}
            className={cn(CHOICE_ITEM_CLASS_NAME, itemClassName)}
          >
            {option.label}
          </ToggleGroupItem>
        ))}
      </ToggleGroup>
      <FieldError
        id={errorDescriptionId(id)}
        errors={errors?.map((message) => ({ message }))}
      />
    </Field>
  );
}

const YES_NO_OPTIONS: readonly ChoiceOption[] = [
  { value: YES_VALUE, label: "Sí" },
  { value: NO_VALUE, label: "No" },
];

function toYesNoValue(value: boolean | null): string {
  if (value === null) {
    return "";
  }
  return value ? YES_VALUE : NO_VALUE;
}

export function YesNoField({
  value,
  onValueChange,
  ...fieldProps
}: {
  id: string;
  label: string;
  description?: string;
  value: boolean | null;
  onValueChange: (value: boolean) => void;
  isRequired?: boolean;
  errors?: string[];
  className?: string;
}) {
  return (
    <ChoiceField
      {...fieldProps}
      options={YES_NO_OPTIONS}
      value={toYesNoValue(value)}
      onValueChange={(nextValue) => onValueChange(nextValue === YES_VALUE)}
      itemClassName="px-5"
    />
  );
}
