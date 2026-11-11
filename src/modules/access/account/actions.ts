"use server";

import {
  type ActionResult,
  refreshOnSuccess,
  toInvalidResult,
  toRejectedResult,
} from "@/platform/operation-result";

import {
  columnPreferenceSchema,
  type OwnNameInput,
  ownNameSchema,
  totpUriSchema,
} from "./schemas";
import { renderTotpQrCode, saveHiddenColumns, updateOwnName } from "./service";
import { requireSession } from "../auth/session";

export async function createTotpQrCodeAction(
  totpUri: string,
): Promise<string | null> {
  await requireSession();
  const uri = totpUriSchema.safeParse(totpUri);
  return uri.success ? renderTotpQrCode(uri.data) : null;
}

export async function updateOwnNameAction(
  input: OwnNameInput,
): Promise<ActionResult> {
  const { user } = await requireSession();
  const name = ownNameSchema.safeParse(input);
  if (!name.success) {
    return toInvalidResult(name.error);
  }
  return refreshOnSuccess(await updateOwnName(user.id, name.data.name));
}

export async function saveHiddenColumnsAction(
  tableKey: string,
  hiddenColumns: string[],
): Promise<ActionResult> {
  const { user } = await requireSession();
  const preference = columnPreferenceSchema.safeParse({
    tableKey,
    hiddenColumns,
  });
  if (!preference.success) {
    return toRejectedResult(preference.error);
  }
  return saveHiddenColumns(user.id, preference.data);
}
