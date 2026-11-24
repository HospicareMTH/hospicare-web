import { eq, sql } from "drizzle-orm";

import {
  type DatabaseTransaction,
  getDatabase,
} from "@/platform/database/client";

import type { EditWindow } from "./schemas";
import {
  DAILY_EVOLUTION_EDIT_WINDOW_KEY,
  LAST_CLINICAL_RECORD_NUMBER_KEY,
  systemSettings,
} from "./tables";

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

export async function saveAssignedClinicalRecordNumberValue(
  transaction: DatabaseTransaction,
  value: number,
): Promise<void> {
  // El trigger de auditoría omite este cambio: el número consta en la entrada del huésped creado.
  await transaction.execute(
    sql`select set_config('hospicare.audit_context', 'clinical_record_number_assignment', true)`,
  );
  await transaction
    .update(systemSettings)
    .set({ value })
    .where(byLastClinicalRecordNumber);
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

const byDailyEvolutionEditWindow = eq(
  systemSettings.key,
  DAILY_EVOLUTION_EDIT_WINDOW_KEY,
);

export async function findDailyEvolutionEditWindowRecord(): Promise<SystemSettingRecord | null> {
  const [record] = await getDatabase()
    .select({
      value: systemSettings.value,
      updatedByUserId: systemSettings.updatedByUserId,
      updatedAt: systemSettings.updatedAt,
    })
    .from(systemSettings)
    .where(byDailyEvolutionEditWindow);
  return record ?? null;
}

export async function lockDailyEvolutionEditWindowValue(
  transaction: DatabaseTransaction,
): Promise<unknown> {
  const [record] = await transaction
    .select({ value: systemSettings.value })
    .from(systemSettings)
    .where(byDailyEvolutionEditWindow)
    .for("update");
  return record?.value;
}

export async function saveDailyEvolutionEditWindowValue(
  transaction: DatabaseTransaction,
  value: EditWindow,
  actorUserId: string,
): Promise<void> {
  await transaction
    .update(systemSettings)
    .set({ value, updatedByUserId: actorUserId, updatedAt: new Date() })
    .where(byDailyEvolutionEditWindow);
}
