import { sql } from "drizzle-orm";
import {
  check,
  index,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";

export const DAILY_EVOLUTION_TEXT_LIMITS = { minLength: 10, maxLength: 5000 };

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
  },
  (table) => [
    index("daily_evolutions_guest_created_at_index").on(
      table.guestId,
      table.createdAt,
    ),
    check(
      "daily_evolutions_text_length",
      sql`char_length(${table.text}) between ${sql.raw(String(DAILY_EVOLUTION_TEXT_LIMITS.minLength))} and ${sql.raw(String(DAILY_EVOLUTION_TEXT_LIMITS.maxLength))}`,
    ),
    check(
      "daily_evolutions_signature_present",
      sql`char_length(${table.signature}) > 0`,
    ),
    check(
      "daily_evolutions_editable_until_after_creation",
      sql`${table.editableUntil} >= ${table.createdAt}`,
    ),
  ],
);
