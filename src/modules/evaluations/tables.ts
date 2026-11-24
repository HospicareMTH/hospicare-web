import { sql } from "drizzle-orm";
import {
  type AnyPgColumn,
  boolean,
  check,
  date,
  pgTable,
  primaryKey,
  smallint,
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

export const ESAS_MINIMUM_SCORE = 0;
export const ESAS_MAXIMUM_SCORE = 10;
export const VITAL_SIGN_MAX_LENGTH = 40;
export const PHYSICAL_EVALUATION_SHORT_TEXT_MAX_LENGTH = 200;
export const PHYSICAL_EVALUATION_LONG_TEXT_MAX_LENGTH = 2000;

export const PRESSURE_ULCER_STAGES = ["I", "II", "III", "IV"] as const;

export type PressureUlcerStage = (typeof PRESSURE_ULCER_STAGES)[number];

function scoreRangeChecks(columns: Record<string, AnyPgColumn>) {
  return Object.entries(columns).map(([name, column]) =>
    check(
      `physical_evaluations_${name}_range`,
      sql`${column} between ${sql.raw(String(ESAS_MINIMUM_SCORE))} and ${sql.raw(String(ESAS_MAXIMUM_SCORE))}`,
    ),
  );
}

function maxLengthChecks(
  maxLength: number,
  columns: Record<string, AnyPgColumn>,
) {
  return Object.entries(columns).map(([name, column]) =>
    check(
      `physical_evaluations_${name}_length`,
      sql`char_length(${column}) <= ${sql.raw(String(maxLength))}`,
    ),
  );
}

export const physicalAdmissionEvaluations = pgTable(
  "physical_admission_evaluations",
  {
    id: uuid().primaryKey().defaultRandom(),
    guestId: uuid().notNull(),
    evaluationDate: date({ mode: "string" }).notNull(),
    painScore: smallint().notNull(),
    tirednessScore: smallint().notNull(),
    nauseaScore: smallint().notNull(),
    depressionScore: smallint().notNull(),
    anxietyScore: smallint().notNull(),
    drowsinessScore: smallint().notNull(),
    appetiteScore: smallint().notNull(),
    dyspneaScore: smallint().notNull(),
    sleepDifficultyScore: smallint().notNull(),
    wellbeingScore: smallint().notNull(),
    heartRate: text(),
    bloodPressure: text(),
    respiratoryRate: text(),
    temperature: text(),
    painCause: text(),
    painLocation: text(),
    painIntensity: text(),
    painType: text(),
    ambulationOptionId: uuid(),
    ambulationCauseOptionId: uuid(),
    neurologicalLesionDetail: text(),
    ecogScoreOptionId: uuid(),
    bathroomTransferOptionId: uuid(),
    swallowingOptionId: uuid(),
    nutritionOptionId: uuid(),
    hydrationOptionId: uuid(),
    hydrationRouteOptionId: uuid(),
    abdomenOptionId: uuid(),
    diuresisOptionId: uuid(),
    urineOptionId: uuid(),
    lastCatarsisDate: date({ mode: "string" }),
    respiratoryOptionId: uuid(),
    expectorationType: text(),
    hasPressureUlcers: boolean().notNull(),
    pressureUlcerStage: text({ enum: PRESSURE_ULCER_STAGES }),
    pressureUlcerLocation: text(),
    otherSkinLesions: text(),
    hasEdemas: boolean().notNull(),
    edemaLocation: text(),
    hasOstomies: boolean().notNull(),
    ostomyType: text(),
    otherDisorders: text(),
    carePlan: text(),
    createdByUserId: text(),
    updatedByUserId: text(),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    // RF-FIS-01: una sola evaluación física de ingreso por huésped.
    uniqueIndex("physical_admission_evaluations_guest_unique").on(
      table.guestId,
    ),
    ...scoreRangeChecks({
      pain_score: table.painScore,
      tiredness_score: table.tirednessScore,
      nausea_score: table.nauseaScore,
      depression_score: table.depressionScore,
      anxiety_score: table.anxietyScore,
      drowsiness_score: table.drowsinessScore,
      appetite_score: table.appetiteScore,
      dyspnea_score: table.dyspneaScore,
      sleep_difficulty_score: table.sleepDifficultyScore,
      wellbeing_score: table.wellbeingScore,
    }),
    ...maxLengthChecks(VITAL_SIGN_MAX_LENGTH, {
      heart_rate: table.heartRate,
      blood_pressure: table.bloodPressure,
      respiratory_rate: table.respiratoryRate,
      temperature: table.temperature,
    }),
    ...maxLengthChecks(PHYSICAL_EVALUATION_SHORT_TEXT_MAX_LENGTH, {
      pain_cause: table.painCause,
      pain_location: table.painLocation,
      pain_intensity: table.painIntensity,
      pain_type: table.painType,
      neurological_lesion_detail: table.neurologicalLesionDetail,
      expectoration_type: table.expectorationType,
      pressure_ulcer_location: table.pressureUlcerLocation,
      edema_location: table.edemaLocation,
      ostomy_type: table.ostomyType,
    }),
    ...maxLengthChecks(PHYSICAL_EVALUATION_LONG_TEXT_MAX_LENGTH, {
      other_skin_lesions: table.otherSkinLesions,
      other_disorders: table.otherDisorders,
      care_plan: table.carePlan,
    }),
    // RN-12 y RN-13: los datos del dolor existen solo con puntaje de dolor mayor que 0.
    check(
      "physical_evaluations_pain_dependency",
      sql`(
        ${table.painScore} > 0
        and ${table.painCause} is not null
        and ${table.painLocation} is not null
        and ${table.painIntensity} is not null
        and ${table.painType} is not null
      ) or (
        ${table.painScore} = 0
        and ${table.painCause} is null
        and ${table.painLocation} is null
        and ${table.painIntensity} is null
        and ${table.painType} is null
      )`,
    ),
    check(
      "physical_evaluations_pressure_ulcer_dependency",
      sql`(
        ${table.hasPressureUlcers}
        and ${table.pressureUlcerStage} in ('I', 'II', 'III', 'IV')
        and ${table.pressureUlcerLocation} is not null
      ) or (
        not ${table.hasPressureUlcers}
        and ${table.pressureUlcerStage} is null
        and ${table.pressureUlcerLocation} is null
      )`,
    ),
    check(
      "physical_evaluations_edema_dependency",
      sql`${table.hasEdemas} = (${table.edemaLocation} is not null)`,
    ),
    check(
      "physical_evaluations_ostomy_dependency",
      sql`${table.hasOstomies} = (${table.ostomyType} is not null)`,
    ),
  ],
);

function physicalEvaluationSelectionTable(name: string) {
  return pgTable(
    name,
    {
      guestId: uuid().notNull(),
      optionId: uuid().notNull(),
      createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
    },
    (table) => [
      primaryKey({
        name: `${name}_pk`,
        columns: [table.guestId, table.optionId],
      }),
    ],
  );
}

export const physicalEvaluationHygieneOptions =
  physicalEvaluationSelectionTable("physical_evaluation_hygiene_options");

export const physicalEvaluationMouthOptions = physicalEvaluationSelectionTable(
  "physical_evaluation_mouth_options",
);

export const physicalEvaluationCatarsisOptions =
  physicalEvaluationSelectionTable("physical_evaluation_catarsis_options");

export const physicalEvaluationCatarsisConsistencyOptions =
  physicalEvaluationSelectionTable(
    "physical_evaluation_catarsis_consistency_options",
  );
