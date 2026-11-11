"use client";

import { useRouter } from "next/navigation";

import {
  SELECT_ITEM_CLASS_NAME,
  SELECT_TRIGGER_CLASS_NAME,
} from "@/components/shared/form-styles";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { LIST_PARAMETERS } from "@/platform/list-query";

import { useListHref } from "./list-controls";

const ALL_OPTIONS_VALUE = "todos";

export function FilterSelect({
  label,
  allLabel,
  parameter,
  value,
  options,
}: {
  label: string;
  allLabel: string;
  parameter: string;
  value: string | null;
  options: { value: string; label: string }[];
}) {
  const router = useRouter();
  const buildHref = useListHref();

  return (
    <Select
      value={value ?? ALL_OPTIONS_VALUE}
      onValueChange={(nextValue) =>
        router.push(
          buildHref({
            [parameter]: nextValue === ALL_OPTIONS_VALUE ? null : nextValue,
            [LIST_PARAMETERS.page]: null,
          }),
        )
      }
    >
      <SelectTrigger
        aria-label={label}
        className={`w-full sm:w-48 ${SELECT_TRIGGER_CLASS_NAME}`}
      >
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem
          value={ALL_OPTIONS_VALUE}
          className={SELECT_ITEM_CLASS_NAME}
        >
          {allLabel}
        </SelectItem>
        {options.map((option) => (
          <SelectItem
            key={option.value}
            value={option.value}
            className={SELECT_ITEM_CLASS_NAME}
          >
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
