"use client";

import {
  ArrowDown01Icon,
  ArrowUp01Icon,
  ArrowUpDownIcon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";

import { Button } from "@/components/ui/button";
import { TableHead } from "@/components/ui/table";
import {
  formatListSort,
  LIST_PARAMETERS,
  type ListSort,
} from "@/platform/list-query";

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
    [LIST_PARAMETERS.sort]:
      nextSort === formatListSort(defaultSort) ? null : nextSort,
    [LIST_PARAMETERS.page]: null,
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
