import { z } from "zod";

import {
  type OperationResult,
  reject,
  SUCCESS,
} from "@/platform/operation-result";

export type SelectableCatalogEntry = {
  id: string;
  label: string;
  isActive: boolean;
};

const entryIdSchema = z.uuid();

export function isCatalogEntryId(candidate: string): boolean {
  return entryIdSchema.safeParse(candidate).success;
}

function describeUnavailableEntry(label: string): string {
  return `La opción «${label}» ya no está disponible. Elegí otra.`;
}

export function checkCatalogSelection(
  selectedIds: readonly string[],
  savedIds: readonly string[],
  foundEntries: readonly SelectableCatalogEntry[],
  missingEntryMessage: string,
): OperationResult {
  const foundEntriesById = new Map(
    foundEntries.map((entry) => [entry.id, entry]),
  );
  for (const selectedId of new Set(selectedIds)) {
    const entry = foundEntriesById.get(selectedId);
    if (!entry) {
      return reject(missingEntryMessage);
    }
    if (!entry.isActive && !savedIds.includes(selectedId)) {
      return reject(describeUnavailableEntry(entry.label));
    }
  }
  return SUCCESS;
}
