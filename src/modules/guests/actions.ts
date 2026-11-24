"use server";

import { refresh } from "next/cache";
import { z } from "zod";

import {
  getCurrentUser,
  hasPermission,
  requirePermission,
} from "@/modules/access";
import { dniSchema } from "@/platform/field-validation";
import { toInvalidResult, toRejectedResult } from "@/platform/operation-result";

import { guestDetailsSchema, type GuestDetailsInput } from "./schemas";
import {
  type AcceptInterviewResult,
  acceptAdmissionInterview,
  createGuestManually,
  type CreateGuestResult,
  INTERVIEW_ACCEPTANCE_REJECTION_MESSAGES,
  isDniInActiveGuest,
  isDniInPendingInterview,
} from "./service";

const interviewIdSchema = z.uuid({
  error: INTERVIEW_ACCEPTANCE_REJECTION_MESSAGES.notFound,
});

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

export async function acceptAdmissionInterviewAction(
  interviewId: string,
): Promise<AcceptInterviewResult> {
  const { access } = await requirePermission("guests.records.create");
  const parsedId = interviewIdSchema.safeParse(interviewId);
  if (!parsedId.success) {
    return toRejectedResult(parsedId.error);
  }
  const result = await acceptAdmissionInterview(access.userId, parsedId.data);
  if (result.status === "success") {
    refresh();
  }
  return result;
}

export type GuestDniCheck = {
  hasActiveGuest: boolean;
  hasPendingInterview: boolean;
};

const NO_DNI_MATCHES: GuestDniCheck = {
  hasActiveGuest: false,
  hasPendingInterview: false,
};

export async function checkGuestDniAction(
  candidate: string,
): Promise<GuestDniCheck> {
  const { access } = await getCurrentUser();
  const canLoadGuests =
    hasPermission(access, "guests.records.manual_create") ||
    hasPermission(access, "guests.records.update");
  const parsedDni = dniSchema.safeParse(candidate);
  if (!canLoadGuests || !parsedDni.success) {
    return NO_DNI_MATCHES;
  }
  const [hasActiveGuest, hasPendingInterview] = await Promise.all([
    isDniInActiveGuest(parsedDni.data),
    isDniInPendingInterview(parsedDni.data),
  ]);
  return { hasActiveGuest, hasPendingInterview };
}
