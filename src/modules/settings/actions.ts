"use server";

import { requirePermission } from "@/modules/access";
import {
  type ActionResult,
  refreshOnSuccess,
  toInvalidResult,
} from "@/platform/operation-result";

import {
  type LastClinicalRecordNumberInput,
  lastClinicalRecordNumberInputSchema,
} from "./schemas";
import { updateLastClinicalRecordNumber } from "./service";

export async function updateLastClinicalRecordNumberAction(
  input: LastClinicalRecordNumberInput,
): Promise<ActionResult> {
  const { access } = await requirePermission("admin.system_settings.update");
  const parsedInput = lastClinicalRecordNumberInputSchema.safeParse(input);
  if (!parsedInput.success) {
    return toInvalidResult(parsedInput.error);
  }
  const result = await updateLastClinicalRecordNumber(
    access.userId,
    parsedInput.data.lastClinicalRecordNumber,
  );
  return result.status === "invalid" ? result : refreshOnSuccess(result);
}
