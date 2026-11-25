import { sql } from "drizzle-orm";
import {
  type AnyPgColumn,
  check,
  index,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";

import { ANNULMENT_REASON_LIMITS } from "@/platform/field-validation";

export const DAILY_EVOLUTION_TEXT_LIMITS = { minLength: 10, maxLength: 5000 };

function textLengthCheck(
  name: string,
  column: AnyPgColumn,
  { minLength, maxLength }: { minLength: number; maxLength: number },
) {
  return check(
    name,
    sql`char_length(${column}) between ${sql.raw(String(minLength))} and ${sql.raw(String(maxLength))}`,
  );
}

export const dailyEvolutions = pgTable(
  "daily_evolutions",
  {
    id: uuid().primaryKey().defaultRandom(),
    guestId: uuid().notNull(),
    authorUserId: text(),
    signature: text().notNull(),
    text: text().notNull(),
    createdAt: timestamp({ withTimezone: true }).notNull(),
    // RF-CFG-03: el límite se fija al registrarla y no cambia con la configuración.
    editableUntil: timestamp({ withTimezone: true }).notNull(),
    updatedAt: timestamp({ withTimezone: true }).notNull(),
    // Sección 9: quién la anuló consta en el registro de actividad, no en la evolución.
    annulledAt: timestamp({ withTimezone: true }),
    annulmentReason: text(),
  },
  (table) => [
    index("daily_evolutions_guest_created_at_index").on(
      table.guestId,
      table.createdAt,
    ),
    textLengthCheck(
      "daily_evolutions_text_length",
      table.text,
      DAILY_EVOLUTION_TEXT_LIMITS,
    ),
    check(
      "daily_evolutions_signature_present",
      sql`char_length(${table.signature}) > 0`,
    ),
    check(
      "daily_evolutions_editable_until_after_creation",
      sql`${table.editableUntil} >= ${table.createdAt}`,
    ),
    check(
      "daily_evolutions_annulment_completeness",
      sql`(${table.annulledAt} is null) = (${table.annulmentReason} is null)`,
    ),
    textLengthCheck(
      "daily_evolutions_annulment_reason_length",
      table.annulmentReason,
      ANNULMENT_REASON_LIMITS,
    ),
  ],
);

export const dailyEvolutionClarifications = pgTable(
  "daily_evolution_clarifications",
  {
    id: uuid().primaryKey().defaultRandom(),
    dailyEvolutionId: uuid().notNull(),
    authorUserId: text(),
    signature: text().notNull(),
    text: text().notNull(),
    createdAt: timestamp({ withTimezone: true }).notNull(),
  },
  (table) => [
    index("daily_evolution_clarifications_evolution_index").on(
      table.dailyEvolutionId,
      table.createdAt,
    ),
    textLengthCheck(
      "daily_evolution_clarifications_text_length",
      table.text,
      DAILY_EVOLUTION_TEXT_LIMITS,
    ),
    check(
      "daily_evolution_clarifications_signature_present",
      sql`char_length(${table.signature}) > 0`,
    ),
  ],
);
