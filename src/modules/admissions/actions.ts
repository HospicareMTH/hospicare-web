"use server";

import { requirePermission } from "@/modules/access";
import { dniSchema } from "@/platform/field-validation";
import { toInvalidResult } from "@/platform/operation-result";

import {
  admissionInterviewDetailsSchema,
  type AdmissionInterviewDetailsInput,
} from "./schemas";
import {
  createAdmissionInterview,
  type CreateAdmissionInterviewResult,
  isDniInActiveInterview,
} from "./service";

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

export async function checkDniInActiveInterviewAction(
  candidate: string,
): Promise<boolean> {
  await requirePermission("admissions.interviews.create");
  const parsedDni = dniSchema.safeParse(candidate);
  if (!parsedDni.success) {
    return false;
  }
  return isDniInActiveInterview(parsedDni.data);
}
