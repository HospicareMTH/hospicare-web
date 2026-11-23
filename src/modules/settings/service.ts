import { findUserNames } from "@/modules/access";
import { runInTransactionAs } from "@/platform/database/client";
import { type ActionResult, SUCCESS } from "@/platform/operation-result";

import {
  findLastClinicalRecordNumberRecord,
  lockLastClinicalRecordNumberValue,
  saveLastClinicalRecordNumberValue,
} from "./repository";
import {
  describeMinimumNumber,
  storedClinicalRecordNumberSchema,
} from "./schemas";

export type ClinicalRecordNumberSetting = {
  lastAssignedNumber: number;
  lastModification: { modifiedAt: Date; modifiedByName: string } | null;
};

export async function getClinicalRecordNumberSetting(): Promise<ClinicalRecordNumberSetting> {
  const record = await findLastClinicalRecordNumberRecord();
  if (!record) {
    throw new Error(
      "Falta el parámetro del último número de historia clínica.",
    );
  }
  const lastAssignedNumber = storedClinicalRecordNumberSchema.parse(
    record.value,
  );
  if (!record.updatedByUserId) {
    return { lastAssignedNumber, lastModification: null };
  }
  const userNames = await findUserNames([record.updatedByUserId]);
  const modifiedByName = userNames.get(record.updatedByUserId);
  return {
    lastAssignedNumber,
    lastModification: modifiedByName
      ? { modifiedAt: record.updatedAt, modifiedByName }
      : null,
  };
}

export function updateLastClinicalRecordNumber(
  actorUserId: string,
  nextValue: number,
): Promise<ActionResult> {
  return runInTransactionAs(actorUserId, async (transaction) => {
    const lastAssignedNumber = storedClinicalRecordNumberSchema.parse(
      await lockLastClinicalRecordNumberValue(transaction),
    );
    if (nextValue < lastAssignedNumber) {
      return {
        status: "invalid",
        fieldErrors: {
          lastClinicalRecordNumber: [describeMinimumNumber(lastAssignedNumber)],
        },
      };
    }
    if (nextValue === lastAssignedNumber) {
      return SUCCESS;
    }
    await saveLastClinicalRecordNumberValue(
      transaction,
      nextValue,
      actorUserId,
    );
    return SUCCESS;
  });
}
