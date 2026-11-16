"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";

import {
  DIALOG_BUTTON_CLASS_NAME,
  SELECT_ITEM_CLASS_NAME,
  SELECT_TRIGGER_CLASS_NAME,
} from "@/components/shared/form-styles";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import {
  CATALOG_GROUP_LABELS,
  CATALOG_GROUPS,
  type CatalogGroup,
} from "../definitions";
import { buildCatalogHref } from "../schemas";

export type CatalogChoice = {
  slug: string;
  label: string;
  group: CatalogGroup;
};

export function CatalogPicker({
  catalogs,
  currentCatalog,
}: {
  catalogs: CatalogChoice[];
  currentCatalog: CatalogChoice;
}) {
  const router = useRouter();
  const groupEntries = CATALOG_GROUPS.flatMap((group) => {
    const firstCatalog = catalogs.find((catalog) => catalog.group === group);
    return firstCatalog ? [{ group, firstCatalog }] : [];
  });
  const currentGroupCatalogs = catalogs.filter(
    (catalog) => catalog.group === currentCatalog.group,
  );

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
      {groupEntries.length > 1 && (
        <nav
          aria-label="Grupos de catálogos"
          className="grid grid-cols-2 gap-2 sm:flex"
        >
          {groupEntries.map(({ group, firstCatalog }) => {
            const isCurrent = group === currentCatalog.group;
            return (
              <Button
                key={group}
                asChild
                variant={isCurrent ? "default" : "outline"}
                className={DIALOG_BUTTON_CLASS_NAME}
              >
                <Link
                  href={buildCatalogHref(firstCatalog.slug)}
                  aria-current={isCurrent ? "page" : undefined}
                >
                  {CATALOG_GROUP_LABELS[group]}
                </Link>
              </Button>
            );
          })}
        </nav>
      )}
      <Select
        value={currentCatalog.slug}
        onValueChange={(slug) => router.push(buildCatalogHref(slug))}
      >
        <SelectTrigger
          aria-label="Catálogo"
          className={`w-full sm:w-80 ${SELECT_TRIGGER_CLASS_NAME}`}
        >
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {currentGroupCatalogs.map((catalog) => (
            <SelectItem
              key={catalog.slug}
              value={catalog.slug}
              className={SELECT_ITEM_CLASS_NAME}
            >
              {catalog.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
