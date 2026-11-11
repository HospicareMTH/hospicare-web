"use client";

import { useRouter } from "next/navigation";
import { useId } from "react";

import {
  SELECT_ITEM_CLASS_NAME,
  SELECT_TRIGGER_CLASS_NAME,
} from "@/components/shared/form-styles";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DEFAULT_PAGE_SIZE,
  LIST_PARAMETERS,
  PAGE_SIZE_OPTIONS,
} from "@/platform/list-query";

import { useListHref } from "./list-controls";

const FIRST_PAGE = 1;
const VISIBLE_PAGE_RADIUS = 2;

function getVisiblePages(page: number, pageCount: number): number[] {
  const first = Math.max(FIRST_PAGE, page - VISIBLE_PAGE_RADIUS);
  const last = Math.min(pageCount, page + VISIBLE_PAGE_RADIUS);
  return Array.from({ length: last - first + 1 }, (_, index) => first + index);
}

function PageSizeSelect({ pageSize }: { pageSize: number }) {
  const router = useRouter();
  const buildHref = useListHref();
  const labelId = useId();

  return (
    <div className="flex items-center gap-2">
      <span id={labelId} className="text-sm text-muted-foreground">
        Filas por página
      </span>
      <Select
        value={String(pageSize)}
        onValueChange={(value) =>
          router.push(
            buildHref({
              [LIST_PARAMETERS.pageSize]:
                value === String(DEFAULT_PAGE_SIZE) ? null : value,
              [LIST_PARAMETERS.page]: null,
            }),
          )
        }
      >
        <SelectTrigger
          aria-labelledby={labelId}
          className={`w-24 ${SELECT_TRIGGER_CLASS_NAME}`}
        >
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {PAGE_SIZE_OPTIONS.map((option) => (
            <SelectItem
              key={option}
              value={String(option)}
              className={SELECT_ITEM_CLASS_NAME}
            >
              {option}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

export function DataTablePagination({
  totalLabel,
  paginationLabel,
  page,
  pageCount,
  pageSize,
}: {
  totalLabel: string;
  paginationLabel: string;
  page: number;
  pageCount: number;
  pageSize: number;
}) {
  const buildHref = useListHref();
  const pageHref = (target: number) =>
    buildHref({
      [LIST_PARAMETERS.page]: target > FIRST_PAGE ? String(target) : null,
    });

  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <p className="text-sm text-muted-foreground">{totalLabel}</p>
      <div className="flex flex-wrap items-center gap-4">
        <PageSizeSelect pageSize={pageSize} />
        {pageCount > FIRST_PAGE && (
          <Pagination aria-label={paginationLabel} className="mx-0 w-auto">
            <PaginationContent>
              {page > FIRST_PAGE && (
                <PaginationItem>
                  <PaginationPrevious
                    href={pageHref(page - 1)}
                    text="Anterior"
                    aria-label="Ir a la página anterior"
                  />
                </PaginationItem>
              )}
              {getVisiblePages(page, pageCount).map((target) => (
                <PaginationItem key={target}>
                  <PaginationLink
                    href={pageHref(target)}
                    isActive={target === page}
                    aria-label={`Página ${target}`}
                    className="tabular-nums"
                  >
                    {target}
                  </PaginationLink>
                </PaginationItem>
              ))}
              {page < pageCount && (
                <PaginationItem>
                  <PaginationNext
                    href={pageHref(page + 1)}
                    text="Siguiente"
                    aria-label="Ir a la página siguiente"
                  />
                </PaginationItem>
              )}
            </PaginationContent>
          </Pagination>
        )}
      </div>
    </div>
  );
}
