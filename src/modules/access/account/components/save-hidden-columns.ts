"use client";

import { saveHiddenColumnsWith } from "@/components/shared/data-table/save-hidden-columns";

import { saveHiddenColumnsAction } from "../actions";

export function saveHiddenColumns(
  tableKey: string,
  hiddenColumns: string[],
): Promise<void> {
  return saveHiddenColumnsWith(
    saveHiddenColumnsAction,
    tableKey,
    hiddenColumns,
  );
}
