import { sql } from "drizzle-orm";
import {
  boolean,
  check,
  date,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

export const CAM_STOPPING_CRITERIA = ["acute_onset", "inattention"] as const;

export type CamStoppingCriterion = (typeof CAM_STOPPING_CRITERIA)[number];

export const CAM_OBSERVATIONS_MAX_LENGTH = 100;

export const camEvaluations = pgTable(
  "cam_evaluations",
  {
    id: uuid().primaryKey().defaultRandom(),
    guestId: uuid().notNull(),
    evaluationDate: date({ mode: "string" }).notNull(),
    acuteOnset: boolean().notNull(),
    inattention: boolean(),
    disorganizedThinking: boolean(),
    alteredConsciousness: boolean(),
    isDeliriumLikely: boolean().notNull(),
    stoppedAtCriterion: text({ enum: CAM_STOPPING_CRITERIA }),
    observations: text(),
    createdByUserId: text(),
    updatedByUserId: text(),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    // RF-CAM-01: una sola evaluación CAM por huésped.
    uniqueIndex("cam_evaluations_guest_unique").on(table.guestId),
    check(
      "cam_evaluations_observations_length",
      sql`char_length(${table.observations}) <= ${sql.raw(String(CAM_OBSERVATIONS_MAX_LENGTH))}`,
    ),
    // RF-CAM-02 y RF-CAM-03: el corte y el resultado siguen a los criterios.
    check(
      "cam_evaluations_criteria_consistency",
      sql`(
        not ${table.acuteOnset}
        and ${table.inattention} is null
        and ${table.disorganizedThinking} is null
        and ${table.alteredConsciousness} is null
        and ${table.stoppedAtCriterion} = 'acute_onset'
        and not ${table.isDeliriumLikely}
      ) or (
        ${table.acuteOnset}
        and ${table.inattention} = false
        and ${table.disorganizedThinking} is null
        and ${table.alteredConsciousness} is null
        and ${table.stoppedAtCriterion} = 'inattention'
        and not ${table.isDeliriumLikely}
      ) or (
        ${table.acuteOnset}
        and ${table.inattention}
        and ${table.disorganizedThinking} is not null
        and ${table.alteredConsciousness} is not null
        and ${table.stoppedAtCriterion} is null
        and ${table.isDeliriumLikely} = (${table.disorganizedThinking} or ${table.alteredConsciousness})
      )`,
    ),
  ],
);
