"use client";

import { unstable_rethrow } from "next/navigation";
import { toast } from "sonner";

import { saveHiddenColumnsAction } from "../actions";

const SAVE_FAILED_MESSAGE =
  "No pudimos guardar las columnas elegidas. Se van a ver así hasta que recargues la pantalla.";

export async function saveHiddenColumns(
  tableKey: string,
  hiddenColumns: string[],
): Promise<void> {
  try {
    const result = await saveHiddenColumnsAction(tableKey, hiddenColumns);
    if (result.status !== "success") {
      toast.error(SAVE_FAILED_MESSAGE);
    }
  } catch (error) {
    unstable_rethrow(error);
    console.error("No se pudieron guardar las columnas visibles.", error);
    toast.error(SAVE_FAILED_MESSAGE);
  }
}
