"use client";

import { FieldFrame } from "@/components/shared/form-fields";

import type { CatalogFieldData } from "../selection";
import {
  CatalogOptionPicker,
  type CatalogSelectionMode,
} from "./catalog-option-picker";

export function CatalogOptionField({
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
