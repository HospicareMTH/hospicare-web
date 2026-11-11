"use server";

import {
  type ActionResult,
  refreshOnSuccess,
  toInvalidResult,
} from "@/platform/operation-result";

import { type OwnNameInput, ownNameSchema, totpUriSchema } from "./schemas";
import { renderTotpQrCode, updateOwnName } from "./service";
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
