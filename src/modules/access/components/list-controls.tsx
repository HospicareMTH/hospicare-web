"use client";

import {
  ArrowDown01Icon,
  ArrowLeft01Icon,
  ArrowRight01Icon,
  ArrowUp01Icon,
  ArrowUpDownIcon,
  Search01Icon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import Form from "next/form";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import type { ReactNode } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { TableHead } from "@/components/ui/table";

import { formatListSort, type ListSort } from "../schemas";
import { DIALOG_BUTTON_CLASS_NAME, FIELD_CONTROL_CLASS_NAME } from "./styles";

const SEARCH_PARAMETER = "buscar";
const SORT_PARAMETER = "orden";
const PAGE_PARAMETER = "pagina";
const FIRST_PAGE = 1;

type ParameterChanges = Record<string, string | null>;

export function useListHref(): (changes: ParameterChanges) => string {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  return (changes) => {
    const nextParams = new URLSearchParams(searchParams);
    for (const [name, value] of Object.entries(changes)) {
      if (value === null) {
        nextParams.delete(name);
      } else {
        nextParams.set(name, value);
      }
    }
    const queryString = nextParams.toString();
    return queryString ? `${pathname}?${queryString}` : pathname;
  };
}

export function ListToolbar({
  search,
  searchLabel,
  children,
  action,
}: {
  search: string;
  searchLabel: string;
  children?: ReactNode;
  action?: ReactNode;
}) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const preservedParams = [...searchParams.entries()].filter(
    ([name]) => name !== SEARCH_PARAMETER && name !== PAGE_PARAMETER,
  );

  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div className="flex w-full flex-wrap items-center gap-2 lg:w-auto">
        <Form
          action={pathname}
          role="search"
          className="flex w-full items-center gap-2 sm:w-auto"
        >
          {preservedParams.map(([name, value]) => (
            <input key={name} type="hidden" name={name} value={value} />
          ))}
          <Input
            type="search"
            name={SEARCH_PARAMETER}
            defaultValue={search}
            aria-label={searchLabel}
            placeholder={searchLabel}
            className={`${FIELD_CONTROL_CLASS_NAME} sm:w-64`}
          />
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
        {children}
      </div>
      {action}
    </div>
  );
}

export function SortableHead<SortKey extends string>({
  label,
  sortKey,
  sort,
  defaultSort,
  className,
}: {
  label: string;
  sortKey: SortKey;
  sort: ListSort<SortKey>;
  defaultSort: ListSort<SortKey>;
  className?: string;
}) {
  const buildHref = useListHref();
  const isActive = sort.key === sortKey;
  const isDescending = isActive && sort.isDescending;
  const nextSort = formatListSort({
    key: sortKey,
    isDescending: isActive && !sort.isDescending,
  });
  const href = buildHref({
    [SORT_PARAMETER]:
      nextSort === formatListSort(defaultSort) ? null : nextSort,
    [PAGE_PARAMETER]: null,
  });
  const icon = !isActive
    ? ArrowUpDownIcon
    : isDescending
      ? ArrowDown01Icon
      : ArrowUp01Icon;

  return (
    <TableHead
      aria-sort={
        isActive ? (isDescending ? "descending" : "ascending") : "none"
      }
      className={className}
    >
      <Button
        asChild
        variant="ghost"
        className="-ml-2 h-9 px-2 text-sm font-semibold text-foreground"
      >
        <Link href={href} scroll={false}>
          {label}
          <HugeiconsIcon
            icon={icon}
            data-icon="inline-end"
            className={isActive ? "text-primary" : "text-muted-foreground"}
            aria-hidden="true"
          />
        </Link>
      </Button>
    </TableHead>
  );
}

function PageButton({
  page,
  isAvailable,
  children,
}: {
  page: number;
  isAvailable: boolean;
  children: ReactNode;
}) {
  const buildHref = useListHref();
  if (!isAvailable) {
    return (
      <Button variant="outline" disabled className={DIALOG_BUTTON_CLASS_NAME}>
        {children}
      </Button>
    );
  }
  return (
    <Button asChild variant="outline" className={DIALOG_BUTTON_CLASS_NAME}>
      <Link
        href={buildHref({
          [PAGE_PARAMETER]: page > FIRST_PAGE ? String(page) : null,
        })}
      >
        {children}
      </Link>
    </Button>
  );
}

export function ListFooter({
  totalLabel,
  page,
  pageCount,
  paginationLabel,
}: {
  totalLabel: string;
  page: number;
  pageCount: number;
  paginationLabel: string;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <p className="text-sm text-muted-foreground">{totalLabel}</p>
      {pageCount > FIRST_PAGE && (
        <nav aria-label={paginationLabel} className="flex items-center gap-2">
          <PageButton page={page - 1} isAvailable={page > FIRST_PAGE}>
            <HugeiconsIcon icon={ArrowLeft01Icon} aria-hidden="true" />
            Anterior
          </PageButton>
          <span className="px-1 text-sm text-muted-foreground tabular-nums">
            Página {page} de {pageCount}
          </span>
          <PageButton page={page + 1} isAvailable={page < pageCount}>
            Siguiente
            <HugeiconsIcon icon={ArrowRight01Icon} aria-hidden="true" />
          </PageButton>
        </nav>
      )}
    </div>
  );
}
