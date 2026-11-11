import { sql } from "drizzle-orm";
import {
  boolean,
  index,
  integer,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

export const catalog = pgEnum("catalog", [
  "relationship",
  "health_insurance",
  "information_awareness",
  "religion",
  "ecog_score",
  "oncological_treatment",
  "metastasis_location",
  "surgery",
  "hospitalization_reason",
  "uncontrolled_symptom",
  "ambulation",
  "ambulation_cause",
  "hygiene",
  "bathroom_transfer",
  "mouth",
  "swallowing",
  "nutrition",
  "hydration",
  "hydration_route",
  "abdomen",
  "diuresis",
  "urine",
  "catarsis",
  "catarsis_consistency",
  "respiratory",
  "epicrisis_sedation_medication",
  "epicrisis_sedation_reason",
]);

// Ñ queda distinta de N a propósito: en castellano es otra letra ("Año" no es "Ano").
const ACCENTED_LETTERS = "ÁÉÍÓÚÜÀÈÌÒÙÂÊÎÔÛÄËÏÖáéíóúüàèìòùâêîôûäëïö";
const UNACCENTED_LETTERS = "aeiouuaeiouaeiouaeioaeiouuaeiouaeiouaeio";

export const catalogOptions = pgTable(
  "catalog_options",
  {
    id: uuid().primaryKey().defaultRandom(),
    catalog: catalog().notNull(),
    label: text().notNull(),
    normalizedLabel: text().generatedAlwaysAs(
      sql`lower(translate(btrim("label"), ${sql.raw(`'${ACCENTED_LETTERS}'`)}, ${sql.raw(`'${UNACCENTED_LETTERS}'`)}))`,
    ),
    description: text(),
    isActive: boolean().notNull().default(true),
    isSystem: boolean().notNull().default(false),
    sortOrder: integer().notNull(),
    createdByUserId: text(),
    updatedByUserId: text(),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex().on(table.catalog, table.normalizedLabel),
    index().on(table.catalog, table.sortOrder),
  ],
);
