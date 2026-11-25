import { sql } from "drizzle-orm";
import { check, jsonb, pgTable, text, timestamp } from "drizzle-orm/pg-core";

export const LAST_CLINICAL_RECORD_NUMBER_KEY = "last_clinical_record_number";
export const DAILY_EVOLUTION_EDIT_WINDOW_KEY = "daily_evolution_edit_window";

export const SYSTEM_SETTING_KEYS = [
  LAST_CLINICAL_RECORD_NUMBER_KEY,
  DAILY_EVOLUTION_EDIT_WINDOW_KEY,
] as const;

export type SystemSettingKey = (typeof SYSTEM_SETTING_KEYS)[number];

export const EDIT_WINDOW_UNITS = ["minutes", "hours", "days"] as const;

export type EditWindowUnit = (typeof EDIT_WINDOW_UNITS)[number];

// RF-CFG-01 y RF-CFG-02: de 1 minuto a 30 días.
export const EDIT_WINDOW_MAXIMUM_AMOUNTS: Record<EditWindowUnit, number> = {
  minutes: 30 * 24 * 60,
  hours: 30 * 24,
  days: 30,
};

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
      sql`${table.key} in ('last_clinical_record_number', 'daily_evolution_edit_window')`,
    ),
    check(
      "system_settings_last_clinical_record_number_format",
      sql`${table.key} <> 'last_clinical_record_number' or (jsonb_typeof(${table.value}) = 'number' and (${table.value} #>> '{}') ~ '^[0-9]+$')`,
    ),
    check(
      "system_settings_daily_evolution_edit_window_format",
      sql`${table.key} <> 'daily_evolution_edit_window' or ${table.value} = '{"mode": "immediate"}'::jsonb or (
        ${table.value} ->> 'mode' = 'duration'
        and (${table.value} - 'mode' - 'amount' - 'unit') = '{}'::jsonb
        and jsonb_typeof(${table.value} -> 'amount') = 'number'
        and (${table.value} ->> 'amount') ~ '^[1-9][0-9]*$'
        and (
          (${table.value} ->> 'unit' = 'minutes' and (${table.value} ->> 'amount')::numeric <= ${sql.raw(String(EDIT_WINDOW_MAXIMUM_AMOUNTS.minutes))})
          or (${table.value} ->> 'unit' = 'hours' and (${table.value} ->> 'amount')::numeric <= ${sql.raw(String(EDIT_WINDOW_MAXIMUM_AMOUNTS.hours))})
          or (${table.value} ->> 'unit' = 'days' and (${table.value} ->> 'amount')::numeric <= ${sql.raw(String(EDIT_WINDOW_MAXIMUM_AMOUNTS.days))})
        )
      )`,
    ),
  ],
);
