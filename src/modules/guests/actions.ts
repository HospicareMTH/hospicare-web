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
import {
  type ActionResult,
  refreshOnSuccess,
  toInvalidResult,
  toRejectedResult,
} from "@/platform/operation-result";

import {
  guestDetailsSchema,
  type GuestDetailsInput,
  guestIdSchema,
} from "./schemas";
import {
  type AcceptInterviewResult,
  acceptAdmissionInterview,
  createGuestManually,
  type CreateGuestResult,
  INTERVIEW_ACCEPTANCE_REJECTION_MESSAGES,
  findPendingInterviewIdsWithDni,
  GUEST_REJECTION_MESSAGES,
  isDniInActiveGuest,
  updateGuest,
} from "./service";

const interviewIdSchema = z.uuid({
  error: INTERVIEW_ACCEPTANCE_REJECTION_MESSAGES.notFound,
});

const editedGuestIdSchema = guestIdSchema.nullable();

const versionSchema = z.iso.datetime({
  error: "El huésped que estás editando no es válido. Actualizá la pantalla.",
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

export async function updateGuestAction(
  guestId: string,
  version: string,
  input: GuestDetailsInput,
): Promise<ActionResult> {
  const { access } = await requirePermission("guests.records.update");
  const parsedId = guestIdSchema.safeParse(guestId);
  if (!parsedId.success) {
    return { status: "rejected", message: GUEST_REJECTION_MESSAGES.notFound };
  }
  const parsedVersion = versionSchema.safeParse(version);
  if (!parsedVersion.success) {
    return toRejectedResult(parsedVersion.error);
  }
  const parsedDetails = guestDetailsSchema.safeParse(input);
  if (!parsedDetails.success) {
    return toInvalidResult(parsedDetails.error);
  }
  const result = await updateGuest(
    access.userId,
    parsedId.data,
    parsedVersion.data,
    parsedDetails.data,
  );
  return result.status === "invalid" ? result : refreshOnSuccess(result);
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
  excludedGuestId: string | null = null,
): Promise<GuestDniCheck> {
  const { access } = await getCurrentUser();
  const canLoadGuests =
    hasPermission(access, "guests.records.manual_create") ||
    hasPermission(access, "guests.records.update");
  const parsedDni = dniSchema.safeParse(candidate);
  const parsedExcludedId = editedGuestIdSchema.safeParse(excludedGuestId);
  if (!canLoadGuests || !parsedDni.success || !parsedExcludedId.success) {
    return NO_DNI_MATCHES;
  }
  const [hasActiveGuest, pendingInterviewIds] = await Promise.all([
    isDniInActiveGuest(parsedDni.data, parsedExcludedId.data),
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
