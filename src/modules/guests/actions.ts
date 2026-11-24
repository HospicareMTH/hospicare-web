"use server";

import {
  getCurrentUser,
  hasPermission,
  requirePermission,
} from "@/modules/access";
import { dniSchema } from "@/platform/field-validation";
import { toInvalidResult } from "@/platform/operation-result";

import { guestDetailsSchema, type GuestDetailsInput } from "./schemas";
import {
  createGuestManually,
  type CreateGuestResult,
  isDniInActiveGuest,
} from "./service";

export async function createGuestManuallyAction(
  input: GuestDetailsInput,
): Promise<CreateGuestResult> {
  const { access } = await requirePermission("guests.records.manual_create");
  const parsedDetails = guestDetailsSchema.safeParse(input);
  if (!parsedDetails.success) {
    return toInvalidResult(parsedDetails.error);
  }
  return createGuestManually(access.userId, parsedDetails.data);
}

export async function checkDniInActiveGuestAction(
  candidate: string,
): Promise<boolean> {
  const { access } = await getCurrentUser();
  const canLoadGuests =
    hasPermission(access, "guests.records.manual_create") ||
    hasPermission(access, "guests.records.update");
  const parsedDni = dniSchema.safeParse(candidate);
  if (!canLoadGuests || !parsedDni.success) {
    return false;
  }
  return isDniInActiveGuest(parsedDni.data);
}
