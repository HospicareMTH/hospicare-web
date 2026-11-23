import { eq } from "drizzle-orm";

import {
  type DatabaseTransaction,
  getDatabase,
} from "@/platform/database/client";

import { LAST_CLINICAL_RECORD_NUMBER_KEY, systemSettings } from "./tables";

export type SystemSettingRecord = {
  value: unknown;
  updatedByUserId: string | null;
  updatedAt: Date;
};

const byLastClinicalRecordNumber = eq(
  systemSettings.key,
  LAST_CLINICAL_RECORD_NUMBER_KEY,
);

export async function findLastClinicalRecordNumberRecord(): Promise<SystemSettingRecord | null> {
  const [record] = await getDatabase()
    .select({
      value: systemSettings.value,
      updatedByUserId: systemSettings.updatedByUserId,
      updatedAt: systemSettings.updatedAt,
    })
    .from(systemSettings)
    .where(byLastClinicalRecordNumber);
  return record ?? null;
}

export async function lockLastClinicalRecordNumberValue(
  transaction: DatabaseTransaction,
): Promise<unknown> {
  const [record] = await transaction
    .select({ value: systemSettings.value })
    .from(systemSettings)
    .where(byLastClinicalRecordNumber)
    .for("update");
  return record?.value;
}

export async function saveLastClinicalRecordNumberValue(
  transaction: DatabaseTransaction,
  value: number,
  actorUserId: string,
): Promise<void> {
  await transaction
    .update(systemSettings)
    .set({ value, updatedByUserId: actorUserId, updatedAt: new Date() })
    .where(byLastClinicalRecordNumber);
}
