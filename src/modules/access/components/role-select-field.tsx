"use client";

import { RequiredFieldLabel } from "@/components/shared/required-field-label";
import { Field, FieldError } from "@/components/ui/field";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import type { RoleOption } from "../repository";
import { SELECT_ITEM_CLASS_NAME, SELECT_TRIGGER_CLASS_NAME } from "./styles";

export function RoleSelectField({
  id,
  roles,
  value,
  onValueChange,
  errors,
}: {
  id: string;
  roles: RoleOption[];
  value: string;
  onValueChange: (roleId: string) => void;
  errors: string[] | undefined;
}) {
  return (
    <Field data-invalid={errors ? true : undefined}>
      <RequiredFieldLabel htmlFor={id} className="text-base">
        Rol
      </RequiredFieldLabel>
      <Select value={value} onValueChange={onValueChange}>
        <SelectTrigger
          id={id}
          aria-invalid={errors ? true : undefined}
          className={`w-full ${SELECT_TRIGGER_CLASS_NAME}`}
        >
          <SelectValue placeholder="Elegí un rol" />
        </SelectTrigger>
        <SelectContent>
          {roles.map((role) => (
            <SelectItem
              key={role.id}
              value={role.id}
              className={SELECT_ITEM_CLASS_NAME}
            >
              {role.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <FieldError errors={errors?.map((message) => ({ message }))} />
    </Field>
  );
}
