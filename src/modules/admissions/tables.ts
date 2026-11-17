import { sql } from "drizzle-orm";
import {
  boolean,
  check,
  date,
  foreignKey,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";

export const admissionInterviews = pgTable(
  "admission_interviews",
  {
    id: uuid().primaryKey().defaultRandom(),
    interviewDate: date({ mode: "string" }).notNull(),
    guestFirstName: text().notNull(),
    guestLastName: text().notNull(),
    guestBirthDate: date({ mode: "string" }).notNull(),
    guestDni: text().notNull(),
    guestAddress: text().notNull(),
    healthInsuranceOptionId: uuid(),
    healthInsuranceMemberNumber: text(),
    informationAwarenessOptionId: uuid().notNull(),
    religionOptionId: uuid().notNull(),
    religionDetail: text(),
    ecogScoreOptionId: uuid().notNull(),
    personalHistory: text(),
    intervieweeFullName: text().notNull(),
    intervieweePhone: text(),
    intervieweeRelationshipOptionId: uuid(),
    familyComposition: text(),
    referredBy: text(),
    primaryDoctorId: uuid(),
    hasHomeCareDifficulties: boolean().notNull().default(false),
    hasFuneralService: boolean().notNull().default(false),
    hasHomeCare: boolean().notNull().default(false),
    hasEmergencyService: boolean().notNull().default(false),
    tumor: text(),
    hasMetastasis: boolean().notNull().default(false),
    metastasisLocationOptionId: uuid(),
    oncologicalTreatmentOptionId: uuid().notNull(),
    nonOncologicalDisease: text(),
    radiotherapy: text(),
    chemotherapy: text(),
    hemotherapy: text(),
    hasOpioidTreatment: boolean().notNull().default(false),
    opioid: text(),
    otherMedications: text(),
    complementaryStudies: text(),
    createdByUserId: text(),
    updatedByUserId: text(),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
    annulledAt: timestamp({ withTimezone: true }),
    annulledByUserId: text(),
    annulmentReason: text(),
  },
  (table) => [
    check(
      "admission_interviews_guest_dni_format",
      sql`${table.guestDni} ~ '^[1-9][0-9]{6,7}$'`,
    ),
    // RN-12 y RN-13: el lugar existe si y solo si hay metástasis; lo mismo el opioide.
    check(
      "admission_interviews_metastasis_location_dependency",
      sql`${table.hasMetastasis} = (${table.metastasisLocationOptionId} is not null)`,
    ),
    check(
      "admission_interviews_opioid_dependency",
      sql`${table.hasOpioidTreatment} = (${table.opioid} is not null)`,
    ),
    check(
      "admission_interviews_annulment_completeness",
      sql`(${table.annulledAt} is null) = (${table.annulmentReason} is null)`,
    ),
  ],
);

export const admissionInterviewSurgeries = pgTable(
  "admission_interview_surgeries",
  {
    admissionInterviewId: uuid().notNull(),
    surgeryOptionId: uuid().notNull(),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    primaryKey({
      name: "admission_interview_surgeries_pk",
      columns: [table.admissionInterviewId, table.surgeryOptionId],
    }),
    foreignKey({
      name: "admission_interview_surgeries_interview_fk",
      columns: [table.admissionInterviewId],
      foreignColumns: [admissionInterviews.id],
    }),
  ],
);
