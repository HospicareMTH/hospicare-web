import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

const EMPTY_VALUE_LABEL = "Sin cargar";

export type DetailItem = {
  label: string;
  value: ReactNode;
  isWide?: boolean;
};

function isEmptyValue(value: ReactNode): boolean {
  return value === null || value === undefined || value === "";
}

export function DetailList({ items }: { items: DetailItem[] }) {
  return (
    <dl className="grid gap-x-4 gap-y-6 md:grid-cols-2 xl:grid-cols-3">
      {items.map((item) => (
        <div
          key={item.label}
          className={cn(
            "flex flex-col gap-1",
            item.isWide && "md:col-span-full",
          )}
        >
          <dt className="text-base font-medium">{item.label}</dt>
          <dd
            className={cn(
              "text-base whitespace-pre-line",
              isEmptyValue(item.value) && "text-muted-foreground",
            )}
          >
            {isEmptyValue(item.value) ? EMPTY_VALUE_LABEL : item.value}
          </dd>
        </div>
      ))}
    </dl>
  );
}
