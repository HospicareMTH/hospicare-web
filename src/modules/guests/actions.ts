"use server";

import { refresh } from "next/cache";
import { z } from "zod";

import {
  getCurrentUser,
  hasPermission,
  requirePermission,
} from "@/modules/access";
import {
  buildAdmissionInterviewPath,
  buildAdmissionInterviewSearchPath,
} from "@/modules/admissions";
import { dniSchema } from "@/platform/field-validation";
import { toInvalidResult, toRejectedResult } from "@/platform/operation-result";

import { guestDetailsSchema, type GuestDetailsInput } from "./schemas";
import {
  type AcceptInterviewResult,
  acceptAdmissionInterview,
  createGuestManually,
  type CreateGuestResult,
  INTERVIEW_ACCEPTANCE_REJECTION_MESSAGES,
  findPendingInterviewIdsWithDni,
  isDniInActiveGuest,
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
  pendingInterviewHref: string | null;
};

const NO_DNI_MATCHES: GuestDniCheck = {
  hasActiveGuest: false,
  hasPendingInterview: false,
  pendingInterviewHref: null,
};

function toPendingInterviewHref(
  pendingInterviewIds: string[],
  dni: string,
): string | null {
  const [onlyInterviewId] = pendingInterviewIds;
  if (onlyInterviewId === undefined) {
    return null;
  }
  return pendingInterviewIds.length === 1
    ? buildAdmissionInterviewPath(onlyInterviewId)
    : buildAdmissionInterviewSearchPath(dni);
}

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
  const [hasActiveGuest, pendingInterviewIds] = await Promise.all([
    isDniInActiveGuest(parsedDni.data),
    findPendingInterviewIdsWithDni(parsedDni.data),
  ]);
  const canSeeInterviews = hasPermission(access, "admissions.interviews.view");
  return {
    hasActiveGuest,
    hasPendingInterview: pendingInterviewIds.length > 0,
    pendingInterviewHref: canSeeInterviews
      ? toPendingInterviewHref(pendingInterviewIds, parsedDni.data)
      : null,
  };
}
