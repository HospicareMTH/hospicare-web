"use server";

import { refresh } from "next/cache";

import { requirePermission } from "@/modules/access";
import {
  type ActionResult,
  refreshOnSuccess,
  toInvalidResult,
  toRejectedResult,
} from "@/platform/operation-result";

import {
  type CatalogPermissionAction,
  catalogPermission,
  HEALTHCARE_PROFESSIONALS_CATALOG,
} from "../definitions";
import {
  healthcareProfessionalDetailsSchema,
  type HealthcareProfessionalDetailsInput,
  healthcareProfessionalIdSchema,
} from "./schemas";
import {
  createHealthcareProfessional,
  type CreateHealthcareProfessionalResult,
  setHealthcareProfessionalActive,
  updateHealthcareProfessional,
} from "./service";

async function requireProfessionalPermission(
  action: CatalogPermissionAction,
): Promise<string> {
  const { access } = await requirePermission(
    catalogPermission(HEALTHCARE_PROFESSIONALS_CATALOG, action),
  );
  return access.userId;
}

export async function createHealthcareProfessionalAction(
  input: HealthcareProfessionalDetailsInput,
): Promise<CreateHealthcareProfessionalResult> {
  const actorUserId = await requireProfessionalPermission("create");
  const details = healthcareProfessionalDetailsSchema.safeParse(input);
  if (!details.success) {
    return toInvalidResult(details.error);
  }
  const result = await createHealthcareProfessional(actorUserId, details.data);
  if (result.status === "success") {
    refresh();
  }
  return result;
}

export async function updateHealthcareProfessionalAction(
  professionalId: string,
  input: HealthcareProfessionalDetailsInput,
): Promise<ActionResult> {
  const actorUserId = await requireProfessionalPermission("update");
  const parsedProfessionalId =
    healthcareProfessionalIdSchema.safeParse(professionalId);
  if (!parsedProfessionalId.success) {
    return toRejectedResult(parsedProfessionalId.error);
  }
  const details = healthcareProfessionalDetailsSchema.safeParse(input);
  if (!details.success) {
    return toInvalidResult(details.error);
  }
  const result = await updateHealthcareProfessional(
    actorUserId,
    parsedProfessionalId.data,
    details.data,
  );
  if (result.status === "success") {
    refresh();
  }
  return result;
}

async function changeProfessionalActive(
  professionalId: string,
  isActive: boolean,
): Promise<ActionResult> {
  const actorUserId = await requireProfessionalPermission(
    isActive ? "update" : "delete",
  );
  const parsedProfessionalId =
    healthcareProfessionalIdSchema.safeParse(professionalId);
  if (!parsedProfessionalId.success) {
    return toRejectedResult(parsedProfessionalId.error);
  }
  return refreshOnSuccess(
    await setHealthcareProfessionalActive(
      actorUserId,
      parsedProfessionalId.data,
      isActive,
    ),
  );
}

export async function deactivateHealthcareProfessionalAction(
  professionalId: string,
): Promise<ActionResult> {
  return changeProfessionalActive(professionalId, false);
}

export async function reactivateHealthcareProfessionalAction(
  professionalId: string,
): Promise<ActionResult> {
  return changeProfessionalActive(professionalId, true);
}
