"use client";

import { Cancel01Icon, Search01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import Form from "next/form";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { type ReactNode, useState } from "react";

import {
  DIALOG_BUTTON_CLASS_NAME,
  FIELD_CONTROL_CLASS_NAME,
} from "@/components/shared/form-styles";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { LIST_PARAMETERS } from "@/platform/list-query";

import { useListHref } from "./list-controls";

function SearchForm({
  search,
  searchLabel,
}: {
  search: string;
  searchLabel: string;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const buildHref = useListHref();
  const [value, setValue] = useState(search);
  const preservedParams = [...searchParams.entries()].filter(
    ([name]) =>
      name !== LIST_PARAMETERS.search && name !== LIST_PARAMETERS.page,
  );

  function clearSearch() {
    setValue("");
    if (search) {
      router.push(
        buildHref({
          [LIST_PARAMETERS.search]: null,
          [LIST_PARAMETERS.page]: null,
        }),
      );
    }
  }

  return (
    <Form
      action={pathname}
      role="search"
      className="flex w-full items-center gap-2 sm:w-auto"
    >
      {preservedParams.map(([name, parameterValue]) => (
        <input key={name} type="hidden" name={name} value={parameterValue} />
      ))}
      <div className="relative w-full sm:w-64">
        <Input
          type="search"
          name={LIST_PARAMETERS.search}
          value={value}
          onChange={(event) => setValue(event.target.value)}
          aria-label={searchLabel}
          placeholder={searchLabel}
          className={`${FIELD_CONTROL_CLASS_NAME} pr-10 [&::-webkit-search-cancel-button]:appearance-none`}
        />
        {value && (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={clearSearch}
            aria-label="Borrar la búsqueda"
            className="absolute top-1/2 right-1 size-8 -translate-y-1/2 text-muted-foreground"
          >
            <HugeiconsIcon icon={Cancel01Icon} aria-hidden="true" />
          </Button>
        )}
      </div>
      <Button
        type="submit"
        variant="outline"
        className={DIALOG_BUTTON_CLASS_NAME}
      >
        <HugeiconsIcon
          icon={Search01Icon}
          data-icon="inline-start"
          aria-hidden="true"
        />
        Buscar
      </Button>
    </Form>
  );
}

export function DataTableToolbar({
  search,
  searchLabel,
  filters,
  columnMenu,
  action,
}: {
  search: string;
  searchLabel: string;
  filters?: ReactNode;
  columnMenu: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div className="flex w-full flex-wrap items-center gap-2 lg:w-auto">
        <SearchForm key={search} search={search} searchLabel={searchLabel} />
        {filters}
      </div>
      <div className="flex flex-wrap items-center gap-2">
        {columnMenu}
        {action}
      </div>
    </div>
  );
}
