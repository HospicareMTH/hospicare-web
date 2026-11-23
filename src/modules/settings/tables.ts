import { sql } from "drizzle-orm";
import { check, jsonb, pgTable, text, timestamp } from "drizzle-orm/pg-core";

export const LAST_CLINICAL_RECORD_NUMBER_KEY = "last_clinical_record_number";

export const SYSTEM_SETTING_KEYS = [LAST_CLINICAL_RECORD_NUMBER_KEY] as const;

export type SystemSettingKey = (typeof SYSTEM_SETTING_KEYS)[number];

export const systemSettings = pgTable(
  "system_settings",
  {
    key: text({ enum: SYSTEM_SETTING_KEYS }).primaryKey(),
    value: jsonb().notNull(),
    updatedByUserId: text(),
    updatedAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    check(
      "system_settings_key_values",
      sql`${table.key} in ('last_clinical_record_number')`,
    ),
    check(
      "system_settings_last_clinical_record_number_format",
      sql`${table.key} <> 'last_clinical_record_number' or (jsonb_typeof(${table.value}) = 'number' and (${table.value} #>> '{}') ~ '^[0-9]+$')`,
    ),
  ],
);
