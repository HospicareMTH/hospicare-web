"use server";

import { z } from "zod";

import { requirePermission } from "@/modules/access";
import { GUEST_REJECTION_MESSAGES, guestIdSchema } from "@/modules/guests";
import {
  type ActionResult,
  refreshOnSuccess,
  reject,
  toInvalidResult,
  toRejectedResult,
} from "@/platform/operation-result";

import {
  camEvaluationSchema,
  type CamEvaluationInput,
  physicalEvaluationSchema,
  type PhysicalEvaluationInput,
} from "./schemas";
import {
  createCamEvaluation,
  createPhysicalEvaluation,
  updateCamEvaluation,
  updatePhysicalEvaluation,
} from "./service";

const camEvaluationVersionSchema = z.iso.datetime({
  error:
    "La evaluación CAM que estás editando no es válida. Actualizá la pantalla.",
});

const physicalEvaluationVersionSchema = z.iso.datetime({
  error:
    "La evaluación física de ingreso que estás editando no es válida. Actualizá la pantalla.",
});

export async function createCamEvaluationAction(
  guestId: string,
  input: CamEvaluationInput,
): Promise<ActionResult> {
  const { access } = await requirePermission("guests.cam_evaluations.create");
  const parsedGuestId = guestIdSchema.safeParse(guestId);
  if (!parsedGuestId.success) {
    return reject(GUEST_REJECTION_MESSAGES.notFound);
  }
  const parsedEvaluation = camEvaluationSchema.safeParse(input);
  if (!parsedEvaluation.success) {
    return toInvalidResult(parsedEvaluation.error);
  }
  return refreshOnSuccess(
    await createCamEvaluation(
      access.userId,
      parsedGuestId.data,
      parsedEvaluation.data,
    ),
  );
}

export async function updateCamEvaluationAction(
  guestId: string,
  version: string,
  input: CamEvaluationInput,
): Promise<ActionResult> {
  const { access } = await requirePermission("guests.cam_evaluations.update");
  const parsedGuestId = guestIdSchema.safeParse(guestId);
  if (!parsedGuestId.success) {
    return reject(GUEST_REJECTION_MESSAGES.notFound);
  }
  const parsedVersion = camEvaluationVersionSchema.safeParse(version);
  if (!parsedVersion.success) {
    return toRejectedResult(parsedVersion.error);
  }
  const parsedEvaluation = camEvaluationSchema.safeParse(input);
  if (!parsedEvaluation.success) {
    return toInvalidResult(parsedEvaluation.error);
  }
  return refreshOnSuccess(
    await updateCamEvaluation(
      access.userId,
      parsedGuestId.data,
      parsedVersion.data,
      parsedEvaluation.data,
    ),
  );
}

export async function createPhysicalEvaluationAction(
  guestId: string,
  input: PhysicalEvaluationInput,
): Promise<ActionResult> {
  const { access } = await requirePermission(
    "guests.physical_evaluations.create",
  );
  const parsedGuestId = guestIdSchema.safeParse(guestId);
  if (!parsedGuestId.success) {
    return reject(GUEST_REJECTION_MESSAGES.notFound);
  }
  const parsedEvaluation = physicalEvaluationSchema.safeParse(input);
  if (!parsedEvaluation.success) {
    return toInvalidResult(parsedEvaluation.error);
  }
  const result = await createPhysicalEvaluation(
    access.userId,
    parsedGuestId.data,
    parsedEvaluation.data,
  );
  return result.status === "invalid" ? result : refreshOnSuccess(result);
}

export async function updatePhysicalEvaluationAction(
  guestId: string,
  version: string,
  input: PhysicalEvaluationInput,
): Promise<ActionResult> {
  const { access } = await requirePermission(
    "guests.physical_evaluations.update",
  );
  const parsedGuestId = guestIdSchema.safeParse(guestId);
  if (!parsedGuestId.success) {
    return reject(GUEST_REJECTION_MESSAGES.notFound);
  }
  const parsedVersion = physicalEvaluationVersionSchema.safeParse(version);
  if (!parsedVersion.success) {
    return toRejectedResult(parsedVersion.error);
  }
  const parsedEvaluation = physicalEvaluationSchema.safeParse(input);
  if (!parsedEvaluation.success) {
    return toInvalidResult(parsedEvaluation.error);
  }
  const result = await updatePhysicalEvaluation(
    access.userId,
    parsedGuestId.data,
    parsedVersion.data,
    parsedEvaluation.data,
  );
  return result.status === "invalid" ? result : refreshOnSuccess(result);
}
