import { sql } from "drizzle-orm";
import {
  check,
  date,
  foreignKey,
  integer,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

export const GUEST_ORIGINS = ["admission", "manual"] as const;

export type GuestOrigin = (typeof GUEST_ORIGINS)[number];

export const guests = pgTable(
  "guests",
  {
    id: uuid().primaryKey().defaultRandom(),
    clinicalRecordNumber: integer().notNull(),
    hospitalizationDate: date({ mode: "string" }).notNull(),
    firstName: text().notNull(),
    lastName: text().notNull(),
    birthDate: date({ mode: "string" }).notNull(),
    dni: text().notNull(),
    address: text().notNull(),
    healthInsuranceOptionId: uuid(),
    healthInsuranceMemberNumber: text(),
    otherHospitalizationReason: text(),
    origin: text({ enum: GUEST_ORIGINS }).notNull(),
    admissionInterviewId: uuid(),
    createdByUserId: text(),
    updatedByUserId: text(),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
    annulledAt: timestamp({ withTimezone: true }),
    annulledByUserId: text(),
    annulmentReason: text(),
  },
  (table) => [
    uniqueIndex("guests_clinical_record_number_unique").on(
      table.clinicalRecordNumber,
    ),
    // R-14: una entrevista admite otro huésped solo después de anular el anterior.
    uniqueIndex("guests_admission_interview_unique")
      .on(table.admissionInterviewId)
      .where(sql`${table.annulledAt} is null`),
    check(
      "guests_clinical_record_number_positive",
      sql`${table.clinicalRecordNumber} > 0`,
    ),
    check("guests_dni_format", sql`${table.dni} ~ '^[1-9][0-9]{6,7}$'`),
    check(
      "guests_origin_values",
      sql`${table.origin} in ('admission', 'manual')`,
    ),
    check(
      "guests_origin_interview_dependency",
      sql`(${table.origin} = 'admission') = (${table.admissionInterviewId} is not null)`,
    ),
    check(
      "guests_annulment_completeness",
      sql`(${table.annulledAt} is null) = (${table.annulmentReason} is null)`,
    ),
  ],
);

export const guestHospitalizationReasons = pgTable(
  "guest_hospitalization_reasons",
  {
    guestId: uuid().notNull(),
    hospitalizationReasonOptionId: uuid().notNull(),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    primaryKey({
      name: "guest_hospitalization_reasons_pk",
      columns: [table.guestId, table.hospitalizationReasonOptionId],
    }),
    foreignKey({
      name: "guest_hospitalization_reasons_guest_fk",
      columns: [table.guestId],
      foreignColumns: [guests.id],
    }),
  ],
);

export const guestUncontrolledSymptoms = pgTable(
  "guest_uncontrolled_symptoms",
  {
    guestId: uuid().notNull(),
    uncontrolledSymptomOptionId: uuid().notNull(),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    primaryKey({
      name: "guest_uncontrolled_symptoms_pk",
      columns: [table.guestId, table.uncontrolledSymptomOptionId],
    }),
    foreignKey({
      name: "guest_uncontrolled_symptoms_guest_fk",
      columns: [table.guestId],
      foreignColumns: [guests.id],
    }),
  ],
);
