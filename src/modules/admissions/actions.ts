"use server";

import { z } from "zod";

import {
  getCurrentUser,
  hasPermission,
  requirePermission,
} from "@/modules/access";
import {
  annulmentSchema,
  type AnnulmentInput,
  dniSchema,
} from "@/platform/field-validation";
import {
  type ActionResult,
  refreshOnSuccess,
  toInvalidResult,
  toRejectedResult,
} from "@/platform/operation-result";

import {
  admissionInterviewDetailsSchema,
  type AdmissionInterviewDetailsInput,
  admissionInterviewIdSchema,
} from "./schemas";
import {
  annulAdmissionInterview,
  createAdmissionInterview,
  type CreateAdmissionInterviewResult,
  isDniInActiveInterview,
  updateAdmissionInterview,
  type UpdateAdmissionInterviewResult,
} from "./service";

const versionSchema = z.iso.datetime({
  error:
    "La entrevista que estás editando no es válida. Actualizá la pantalla.",
});

export async function createAdmissionInterviewAction(
  input: AdmissionInterviewDetailsInput,
): Promise<CreateAdmissionInterviewResult> {
  const { access } = await requirePermission("admissions.interviews.create");
  const parsedDetails = admissionInterviewDetailsSchema.safeParse(input);
  if (!parsedDetails.success) {
    return toInvalidResult(parsedDetails.error);
  }
  return createAdmissionInterview(access.userId, parsedDetails.data);
}

export async function updateAdmissionInterviewAction(
  interviewId: string,
  version: string,
  input: AdmissionInterviewDetailsInput,
): Promise<UpdateAdmissionInterviewResult> {
  const { access } = await requirePermission("admissions.interviews.update");
  const parsedId = admissionInterviewIdSchema.safeParse(interviewId);
  if (!parsedId.success) {
    return toRejectedResult(parsedId.error);
  }
  const parsedVersion = versionSchema.safeParse(version);
  if (!parsedVersion.success) {
    return toRejectedResult(parsedVersion.error);
  }
  const parsedDetails = admissionInterviewDetailsSchema.safeParse(input);
  if (!parsedDetails.success) {
    return toInvalidResult(parsedDetails.error);
  }
  return updateAdmissionInterview(
    access.userId,
    parsedId.data,
    parsedVersion.data,
    parsedDetails.data,
  );
}

export async function annulAdmissionInterviewAction(
  interviewId: string,
  input: AnnulmentInput,
): Promise<ActionResult> {
  const { access } = await requirePermission("admissions.interviews.annul");
  const parsedId = admissionInterviewIdSchema.safeParse(interviewId);
  if (!parsedId.success) {
    return toRejectedResult(parsedId.error);
  }
  const parsedAnnulment = annulmentSchema.safeParse(input);
  if (!parsedAnnulment.success) {
    return toInvalidResult(parsedAnnulment.error);
  }
  return refreshOnSuccess(
    await annulAdmissionInterview(
      access.userId,
      parsedId.data,
      parsedAnnulment.data.reason,
    ),
  );
}

export async function checkDniInActiveInterviewAction(
  candidate: string,
  excludedInterviewId: string | null,
): Promise<boolean> {
  const { access } = await getCurrentUser();
  const canEditInterviews =
    hasPermission(access, "admissions.interviews.create") ||
    hasPermission(access, "admissions.interviews.update");
  const parsedDni = dniSchema.safeParse(candidate);
  const parsedExcludedId = admissionInterviewIdSchema
    .nullable()
    .safeParse(excludedInterviewId);
  if (!canEditInterviews || !parsedDni.success || !parsedExcludedId.success) {
    return false;
  }
  return isDniInActiveInterview(parsedDni.data, parsedExcludedId.data);
}
