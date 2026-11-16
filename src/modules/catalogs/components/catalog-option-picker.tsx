"use client";

import { PlusSignIcon, UnfoldMoreIcon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { useState, useTransition } from "react";
import { toast } from "sonner";

import { runAction } from "@/components/shared/run-action";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import type { FailedActionResult } from "@/platform/operation-result";

import { createCatalogOptionAction } from "../actions";
import {
  HEALTHCARE_PROFESSIONALS_PICKER,
  type PickerCatalog,
} from "../definitions";
import { createHealthcareProfessionalAction } from "../professionals/actions";
import type { SelectableCatalogEntry } from "../selection";

export type CatalogSelectionMode = "single" | "multiple";

const PLACEHOLDERS: Record<CatalogSelectionMode, string> = {
  single: "Elegí una opción",
  multiple: "Elegí opciones",
};

const LOCALE = "es-AR";

function normalizeForSearch(text: string): string {
  return text
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .trim()
    .toLocaleLowerCase(LOCALE);
}

function describeEntry(entry: SelectableCatalogEntry): string {
  return entry.isActive ? entry.label : `${entry.label} (inactiva)`;
}

function firstFieldError(result: FailedActionResult): string | null {
  if (result.status !== "invalid") {
    return null;
  }
  return Object.values(result.fieldErrors).flat()[0] ?? null;
}

async function createEntry(
  catalog: PickerCatalog,
  label: string,
): Promise<string | null> {
  if (catalog === HEALTHCARE_PROFESSIONALS_PICKER) {
    const result = await runAction(
      () =>
        createHealthcareProfessionalAction({
          fullName: label,
          specialty: "",
          licenseNumber: "",
          phone: "",
          email: "",
        }),
      "Profesional creado.",
    );
    if (result?.status === "success") {
      return result.professionalId;
    }
    const message = result ? firstFieldError(result) : null;
    if (message) {
      toast.error(message);
    }
    return null;
  }
  const result = await runAction(
    () => createCatalogOptionAction(catalog, { label, description: "" }),
    ({ wasReactivated }) =>
      wasReactivated
        ? "Esa opción ya existía y se volvió a activar."
        : "Opción creada.",
  );
  if (result?.status === "success") {
    return result.optionId;
  }
  const message = result ? firstFieldError(result) : null;
  if (message) {
    toast.error(message);
  }
  return null;
}

export function CatalogOptionPicker({
  id,
  catalog,
  options,
  selectionMode,
  value,
  onValueChange,
  canCreate,
  isInvalid = false,
}: {
  id?: string;
  catalog: PickerCatalog;
  options: SelectableCatalogEntry[];
  selectionMode: CatalogSelectionMode;
  value: string[];
  onValueChange: (selectedIds: string[]) => void;
  canCreate: boolean;
  isInvalid?: boolean;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [createdEntries, setCreatedEntries] = useState<
    SelectableCatalogEntry[]
  >([]);
  const [isCreating, startCreating] = useTransition();

  const entries = [
    ...options,
    ...createdEntries.filter(
      (created) => !options.some((option) => option.id === created.id),
    ),
  ];
  const normalizedSearch = normalizeForSearch(search);
  const matchingEntries = entries.filter((entry) =>
    normalizeForSearch(entry.label).includes(normalizedSearch),
  );
  const trimmedSearch = search.trim();
  const canCreateFromSearch =
    canCreate &&
    trimmedSearch !== "" &&
    !entries.some(
      (entry) => normalizeForSearch(entry.label) === normalizedSearch,
    );
  const selectedEntries = entries.filter((entry) => value.includes(entry.id));

  function choose(entryId: string) {
    if (selectionMode === "single") {
      onValueChange([entryId]);
      setIsOpen(false);
      setSearch("");
      return;
    }
    onValueChange(
      value.includes(entryId)
        ? value.filter((selectedId) => selectedId !== entryId)
        : [...value, entryId],
    );
  }

  function createFromSearch() {
    const label = trimmedSearch;
    startCreating(async () => {
      const createdId = await createEntry(catalog, label);
      if (!createdId) {
        return;
      }
      setCreatedEntries((current) => [
        ...current,
        { id: createdId, label, isActive: true },
      ]);
      setSearch("");
      if (selectionMode === "single") {
        onValueChange([createdId]);
        setIsOpen(false);
        return;
      }
      if (!value.includes(createdId)) {
        onValueChange([...value, createdId]);
      }
    });
  }

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button
          id={id}
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={isOpen}
          aria-invalid={isInvalid || undefined}
          className="h-auto min-h-10 w-full justify-between px-3 py-2 text-left text-base font-normal whitespace-normal"
        >
          <span
            className={cn(
              selectedEntries.length === 0 && "text-muted-foreground",
            )}
          >
            {selectedEntries.length === 0
              ? PLACEHOLDERS[selectionMode]
              : selectedEntries.map(describeEntry).join(", ")}
          </span>
          <HugeiconsIcon
            icon={UnfoldMoreIcon}
            className="size-4 shrink-0 opacity-50"
            aria-hidden="true"
          />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        className="w-(--radix-popover-trigger-width) min-w-64 p-0"
      >
        <Command shouldFilter={false}>
          <CommandInput
            value={search}
            onValueChange={setSearch}
            placeholder="Buscar…"
            className="text-base"
          />
          <CommandList>
            {matchingEntries.length === 0 && !canCreateFromSearch && (
              <CommandEmpty>No hay opciones que coincidan.</CommandEmpty>
            )}
            {matchingEntries.length > 0 && (
              <CommandGroup>
                {matchingEntries.map((entry) => (
                  <CommandItem
                    key={entry.id}
                    value={entry.id}
                    data-checked={value.includes(entry.id)}
                    onSelect={() => choose(entry.id)}
                    className="min-h-10 text-base"
                  >
                    <span className="flex flex-wrap items-center gap-2">
                      {entry.label}
                      {!entry.isActive && (
                        <Badge variant="secondary">Inactiva</Badge>
                      )}
                    </span>
                  </CommandItem>
                ))}
              </CommandGroup>
            )}
            {canCreateFromSearch && (
              <CommandGroup>
                <CommandItem
                  value={`crear:${trimmedSearch}`}
                  disabled={isCreating}
                  onSelect={createFromSearch}
                  className="min-h-10 text-base"
                >
                  <HugeiconsIcon icon={PlusSignIcon} aria-hidden="true" />
                  Crear «{trimmedSearch}»
                </CommandItem>
              </CommandGroup>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
