import { findUserNames } from "@/modules/access";
import {
  type DatabaseTransaction,
  runInTransactionAs,
} from "@/platform/database/client";
import {
  type ActionResult,
  type OperationResult,
  SUCCESS,
} from "@/platform/operation-result";

import {
  findDailyEvolutionEditWindowRecord,
  findLastClinicalRecordNumberRecord,
  lockDailyEvolutionEditWindowValue,
  saveDailyEvolutionEditWindowValue,
  lockLastClinicalRecordNumberValue,
  saveAssignedClinicalRecordNumberValue,
  saveLastClinicalRecordNumberValue,
} from "./repository";
import {
  describeMinimumNumber,
  type EditWindow,
  storedClinicalRecordNumberSchema,
  storedEditWindowSchema,
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

export async function assignNextClinicalRecordNumber(
  transaction: DatabaseTransaction,
): Promise<number> {
  const lastAssignedNumber = storedClinicalRecordNumberSchema.parse(
    await lockLastClinicalRecordNumberValue(transaction),
  );
  const assignedNumber = lastAssignedNumber + 1;
  await saveAssignedClinicalRecordNumberValue(transaction, assignedNumber);
  return assignedNumber;
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

export type SettingModification = { modifiedAt: Date; modifiedByName: string };

export type DailyEvolutionEditWindowSetting = {
  window: EditWindow;
  lastModification: SettingModification | null;
};

async function describeModification(record: {
  updatedByUserId: string | null;
  updatedAt: Date;
}): Promise<SettingModification | null> {
  if (!record.updatedByUserId) {
    return null;
  }
  const userNames = await findUserNames([record.updatedByUserId]);
  const modifiedByName = userNames.get(record.updatedByUserId);
  return modifiedByName
    ? { modifiedAt: record.updatedAt, modifiedByName }
    : null;
}

async function findDailyEvolutionEditWindowOrFail() {
  const record = await findDailyEvolutionEditWindowRecord();
  if (!record) {
    throw new Error(
      "Falta el parámetro de la ventana de edición de evoluciones.",
    );
  }
  return { record, window: storedEditWindowSchema.parse(record.value) };
}

export async function getDailyEvolutionEditWindowSetting(): Promise<DailyEvolutionEditWindowSetting> {
  const { record, window } = await findDailyEvolutionEditWindowOrFail();
  return { window, lastModification: await describeModification(record) };
}

// RF-CFG-02: la ventana vigente al registrar una evolución.
export async function getDailyEvolutionEditWindow(): Promise<EditWindow> {
  return (await findDailyEvolutionEditWindowOrFail()).window;
}

function isSameEditWindow(first: EditWindow, second: EditWindow): boolean {
  if (first.mode !== second.mode) {
    return false;
  }
  if (first.mode === "immediate" || second.mode === "immediate") {
    return true;
  }
  return first.amount === second.amount && first.unit === second.unit;
}

export function updateDailyEvolutionEditWindow(
  actorUserId: string,
  nextWindow: EditWindow,
): Promise<OperationResult> {
  return runInTransactionAs(actorUserId, async (transaction) => {
    const savedWindow = storedEditWindowSchema.parse(
      await lockDailyEvolutionEditWindowValue(transaction),
    );
    if (isSameEditWindow(savedWindow, nextWindow)) {
      return SUCCESS;
    }
    await saveDailyEvolutionEditWindowValue(
      transaction,
      nextWindow,
      actorUserId,
    );
    return SUCCESS;
  });
}
