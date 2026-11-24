import { z } from "zod";

import type { CatalogKey } from "@/modules/catalogs";

import {
  optionalOptionIdSchema,
  optionalTextSchema,
  optionIdsSchema,
  pastOrTodayDateSchema,
} from "@/platform/field-validation";

import {
  CAM_OBSERVATIONS_MAX_LENGTH,
  type CamStoppingCriterion,
  ESAS_MAXIMUM_SCORE,
  ESAS_MINIMUM_SCORE,
  PHYSICAL_EVALUATION_LONG_TEXT_MAX_LENGTH,
  PHYSICAL_EVALUATION_SHORT_TEXT_MAX_LENGTH,
  PRESSURE_ULCER_STAGES,
  type PressureUlcerStage,
  VITAL_SIGN_MAX_LENGTH,
} from "./tables";

export const CAM_CRITERION_KEYS = [
  "acuteOnset",
  "inattention",
  "disorganizedThinking",
  "alteredConsciousness",
] as const;

export type CamCriterionKey = (typeof CAM_CRITERION_KEYS)[number];

export type CamCriteria = Record<CamCriterionKey, boolean | null>;

export const CAM_CRITERIA: readonly {
  key: CamCriterionKey;
  label: string;
  question: string;
}[] = [
  {
    key: "acuteOnset",
    label: "Comienzo agudo",
    question: "¿Observaste un cambio agudo en el estado mental del huésped?",
  },
  {
    key: "inattention",
    label: "Inatención",
    question:
      "¿Se distrae con facilidad o tiene dificultad para seguir una conversación?",
  },
  {
    key: "disorganizedThinking",
    label: "Pensamiento desorganizado",
    question:
      "¿Manifiesta ideas o conversaciones incoherentes, o confunde a las personas?",
  },
  {
    key: "alteredConsciousness",
    label: "Conciencia alterada",
    question: "¿Está alterado su nivel de conciencia?",
  },
];

export const CAM_RESULT_LABELS = {
  deliriumLikely: "Delirium probable",
  noDeliriumLikely: "Sin delirium probable",
} as const;

export const NOT_EVALUATED_LABEL = "No evaluado";

export const CRITERION_REQUIRED_MESSAGE = "Elegí Sí o No.";

export type CamOutcome = {
  isDeliriumLikely: boolean;
  stoppedAtCriterion: CamStoppingCriterion | null;
};

export function listReachedCamCriteria(
  criteria: CamCriteria,
): CamCriterionKey[] {
  if (criteria.acuteOnset !== true) {
    return ["acuteOnset"];
  }
  if (criteria.inattention !== true) {
    return ["acuteOnset", "inattention"];
  }
  return [...CAM_CRITERION_KEYS];
}

// RN-12: un criterio que ya no se alcanza se guarda vacío.
export function keepReachedCamCriteria(criteria: CamCriteria): CamCriteria {
  const reached = listReachedCamCriteria(criteria);
  return {
    acuteOnset: criteria.acuteOnset,
    inattention: reached.includes("inattention") ? criteria.inattention : null,
    disorganizedThinking: reached.includes("disorganizedThinking")
      ? criteria.disorganizedThinking
      : null,
    alteredConsciousness: reached.includes("alteredConsciousness")
      ? criteria.alteredConsciousness
      : null,
  };
}

export function listUnansweredCamCriteria(
  criteria: CamCriteria,
): CamCriterionKey[] {
  return listReachedCamCriteria(criteria).filter(
    (key) => criteria[key] === null,
  );
}

export type CamAssessment = CamOutcome &
  Omit<CamCriteria, "acuteOnset"> & { acuteOnset: boolean };

// RF-CAM-02 y RF-CAM-03. Devuelve null mientras falte responder un criterio alcanzado.
export function assessCamCriteria(criteria: CamCriteria): CamAssessment | null {
  const reachedCriteria = keepReachedCamCriteria(criteria);
  const { acuteOnset, inattention } = reachedCriteria;
  if (acuteOnset === null || listUnansweredCamCriteria(criteria).length > 0) {
    return null;
  }
  if (!acuteOnset) {
    return {
      ...reachedCriteria,
      acuteOnset,
      isDeliriumLikely: false,
      stoppedAtCriterion: "acute_onset",
    };
  }
  if (!inattention) {
    return {
      ...reachedCriteria,
      acuteOnset,
      isDeliriumLikely: false,
      stoppedAtCriterion: "inattention",
    };
  }
  return {
    ...reachedCriteria,
    acuteOnset,
    isDeliriumLikely: Boolean(
      reachedCriteria.disorganizedThinking ||
      reachedCriteria.alteredConsciousness,
    ),
    stoppedAtCriterion: null,
  };
}

export function describeCamResult(isDeliriumLikely: boolean): string {
  return isDeliriumLikely
    ? CAM_RESULT_LABELS.deliriumLikely
    : CAM_RESULT_LABELS.noDeliriumLikely;
}

const criterionAnswerSchema = z.boolean().nullable();

export const camEvaluationSchema = z
  .object({
    evaluationDate: pastOrTodayDateSchema("La fecha de la evaluación"),
    acuteOnset: criterionAnswerSchema,
    inattention: criterionAnswerSchema,
    disorganizedThinking: criterionAnswerSchema,
    alteredConsciousness: criterionAnswerSchema,
    observations: optionalTextSchema(
      "El texto de las observaciones",
      CAM_OBSERVATIONS_MAX_LENGTH,
    ),
  })
  .superRefine((input, context) => {
    for (const key of listUnansweredCamCriteria(input)) {
      context.addIssue({
        code: "custom",
        path: [key],
        message: CRITERION_REQUIRED_MESSAGE,
      });
    }
  })
  .transform((input, context) => {
    const assessment = assessCamCriteria(input);
    if (!assessment) {
      context.addIssue({ code: "custom", message: CRITERION_REQUIRED_MESSAGE });
      return z.NEVER;
    }
    return {
      evaluationDate: input.evaluationDate,
      observations: input.observations,
      ...assessment,
    };
  });

export type CamEvaluationInput = z.input<typeof camEvaluationSchema>;

export type CamEvaluationDetails = z.output<typeof camEvaluationSchema>;

export function buildEmptyCamEvaluation(today: string): CamEvaluationInput {
  return {
    evaluationDate: today,
    acuteOnset: null,
    inattention: null,
    disorganizedThinking: null,
    alteredConsciousness: null,
    observations: "",
  };
}

export const ESAS_SYMPTOMS = [
  { key: "painScore", label: "Dolor" },
  { key: "tirednessScore", label: "Cansancio" },
  { key: "nauseaScore", label: "Náuseas" },
  { key: "depressionScore", label: "Depresión" },
  { key: "anxietyScore", label: "Ansiedad" },
  { key: "drowsinessScore", label: "Somnolencia" },
  { key: "appetiteScore", label: "Apetito" },
  { key: "dyspneaScore", label: "Disnea" },
  { key: "sleepDifficultyScore", label: "Dificultad para dormir" },
  { key: "wellbeingScore", label: "Bienestar" },
] as const;

export type EsasScoreKey = (typeof ESAS_SYMPTOMS)[number]["key"];

export const ESAS_SCORE_MARKS: Readonly<Record<number, string>> = {
  0: "Nada",
  4: "Poco",
  6: "Bastante",
  10: "Mucho",
};

export const ESAS_SCORES = Array.from(
  { length: ESAS_MAXIMUM_SCORE - ESAS_MINIMUM_SCORE + 1 },
  (_, index) => ESAS_MINIMUM_SCORE + index,
);

export const ESAS_SCORE_MESSAGE = `Elegí un puntaje de ${ESAS_MINIMUM_SCORE} a ${ESAS_MAXIMUM_SCORE}.`;

const esasScoreSchema = z
  .number()
  .nullable()
  .pipe(
    z
      .number({ error: ESAS_SCORE_MESSAGE })
      .int({ error: ESAS_SCORE_MESSAGE })
      .min(ESAS_MINIMUM_SCORE, { error: ESAS_SCORE_MESSAGE })
      .max(ESAS_MAXIMUM_SCORE, { error: ESAS_SCORE_MESSAGE }),
  );

function shortTextSchema(fieldLabel: string) {
  return optionalTextSchema(
    fieldLabel,
    PHYSICAL_EVALUATION_SHORT_TEXT_MAX_LENGTH,
  );
}

function longTextSchema(fieldLabel: string) {
  return optionalTextSchema(
    fieldLabel,
    PHYSICAL_EVALUATION_LONG_TEXT_MAX_LENGTH,
  );
}

function vitalSignSchema(fieldLabel: string) {
  return optionalTextSchema(fieldLabel, VITAL_SIGN_MAX_LENGTH);
}

function optionalPastDateSchema(fieldLabel: string) {
  return z
    .string()
    .transform((isoDate) => isoDate || null)
    .pipe(pastOrTodayDateSchema(fieldLabel).nullable());
}

const pressureUlcerStageSchema = z
  .union([z.literal(""), z.enum(PRESSURE_ULCER_STAGES)], {
    error: "El estadio elegido no es válido. Actualizá la pantalla.",
  })
  .transform((stage) => stage || null);

export const PAIN_DETAIL_FIELDS = [
  {
    key: "painCause",
    label: "Causa",
    missingMessage: "Escribí la causa del dolor.",
  },
  {
    key: "painLocation",
    label: "Localización",
    missingMessage: "Escribí la localización del dolor.",
  },
  {
    key: "painIntensity",
    label: "Intensidad",
    missingMessage: "Escribí la intensidad del dolor.",
  },
  {
    key: "painType",
    label: "Tipo",
    missingMessage: "Escribí el tipo de dolor.",
  },
] as const;

export const NEUROLOGICAL_LESION_DETAIL_MISSING_MESSAGE =
  "Escribí el detalle de la lesión neurológica.";

export const DEPENDENT_FIELD_MESSAGES = {
  pressureUlcerStage: "Elegí el estadio de las úlceras.",
  pressureUlcerLocation: "Escribí el lugar de las úlceras.",
  edemaLocation: "Escribí el lugar de los edemas.",
  ostomyType: "Escribí el tipo de ostomía.",
} as const;

export const physicalEvaluationSchema = z
  .object({
    evaluationDate: pastOrTodayDateSchema("La fecha de la evaluación"),
    painScore: esasScoreSchema,
    tirednessScore: esasScoreSchema,
    nauseaScore: esasScoreSchema,
    depressionScore: esasScoreSchema,
    anxietyScore: esasScoreSchema,
    drowsinessScore: esasScoreSchema,
    appetiteScore: esasScoreSchema,
    dyspneaScore: esasScoreSchema,
    sleepDifficultyScore: esasScoreSchema,
    wellbeingScore: esasScoreSchema,
    heartRate: vitalSignSchema("La frecuencia cardíaca"),
    bloodPressure: vitalSignSchema("La presión arterial"),
    respiratoryRate: vitalSignSchema("La frecuencia respiratoria"),
    temperature: vitalSignSchema("La temperatura"),
    painCause: shortTextSchema("La causa del dolor"),
    painLocation: shortTextSchema("La localización del dolor"),
    painIntensity: shortTextSchema("La intensidad del dolor"),
    painType: shortTextSchema("El tipo de dolor"),
    ambulationOptionId: optionalOptionIdSchema,
    ambulationCauseOptionId: optionalOptionIdSchema,
    neurologicalLesionDetail: shortTextSchema(
      "El detalle de la lesión neurológica",
    ),
    ecogScoreOptionId: optionalOptionIdSchema,
    bathroomTransferOptionId: optionalOptionIdSchema,
    hygieneOptionIds: optionIdsSchema,
    mouthOptionIds: optionIdsSchema,
    swallowingOptionId: optionalOptionIdSchema,
    nutritionOptionId: optionalOptionIdSchema,
    hydrationOptionId: optionalOptionIdSchema,
    hydrationRouteOptionId: optionalOptionIdSchema,
    abdomenOptionId: optionalOptionIdSchema,
    diuresisOptionId: optionalOptionIdSchema,
    urineOptionId: optionalOptionIdSchema,
    catarsisOptionIds: optionIdsSchema,
    catarsisConsistencyOptionIds: optionIdsSchema,
    lastCatarsisDate: optionalPastDateSchema("La fecha de la última catarsis"),
    respiratoryOptionId: optionalOptionIdSchema,
    expectorationType: shortTextSchema("El tipo de expectoración"),
    hasPressureUlcers: z.boolean(),
    pressureUlcerStage: pressureUlcerStageSchema,
    pressureUlcerLocation: shortTextSchema("El lugar de las úlceras"),
    otherSkinLesions: longTextSchema("El texto de otras lesiones de piel"),
    hasEdemas: z.boolean(),
    edemaLocation: shortTextSchema("El lugar de los edemas"),
    hasOstomies: z.boolean(),
    ostomyType: shortTextSchema("El tipo de ostomía"),
    otherDisorders: longTextSchema("El texto de otros trastornos"),
    carePlan: longTextSchema("El plan de cuidados"),
  })
  // RN-13: los datos que se habilitan pasan a ser obligatorios.
  .superRefine((input, context) => {
    const requiredWhenEnabled: [keyof typeof input, boolean, string][] = [
      ...PAIN_DETAIL_FIELDS.map(
        ({ key, missingMessage }): [keyof typeof input, boolean, string] => [
          key,
          input.painScore > 0,
          missingMessage,
        ],
      ),
      [
        "pressureUlcerStage",
        input.hasPressureUlcers,
        DEPENDENT_FIELD_MESSAGES.pressureUlcerStage,
      ],
      [
        "pressureUlcerLocation",
        input.hasPressureUlcers,
        DEPENDENT_FIELD_MESSAGES.pressureUlcerLocation,
      ],
      [
        "edemaLocation",
        input.hasEdemas,
        DEPENDENT_FIELD_MESSAGES.edemaLocation,
      ],
      ["ostomyType", input.hasOstomies, DEPENDENT_FIELD_MESSAGES.ostomyType],
    ];
    for (const [key, isEnabled, message] of requiredWhenEnabled) {
      if (isEnabled && input[key] === null) {
        context.addIssue({ code: "custom", path: [key], message });
      }
    }
  })
  // RN-12: un dato que ya no se habilita se guarda vacío.
  .transform((input) => {
    const hasPain = input.painScore > 0;
    return {
      ...input,
      painCause: hasPain ? input.painCause : null,
      painLocation: hasPain ? input.painLocation : null,
      painIntensity: hasPain ? input.painIntensity : null,
      painType: hasPain ? input.painType : null,
      pressureUlcerStage: input.hasPressureUlcers
        ? input.pressureUlcerStage
        : null,
      pressureUlcerLocation: input.hasPressureUlcers
        ? input.pressureUlcerLocation
        : null,
      edemaLocation: input.hasEdemas ? input.edemaLocation : null,
      ostomyType: input.hasOstomies ? input.ostomyType : null,
    };
  });

export type PhysicalEvaluationInput = z.input<typeof physicalEvaluationSchema>;

export type PhysicalEvaluationDetails = z.output<
  typeof physicalEvaluationSchema
>;

export type PhysicalEvaluationField = keyof PhysicalEvaluationInput;

export function buildEmptyPhysicalEvaluation(
  today: string,
): PhysicalEvaluationInput {
  return {
    evaluationDate: today,
    painScore: null,
    tirednessScore: null,
    nauseaScore: null,
    depressionScore: null,
    anxietyScore: null,
    drowsinessScore: null,
    appetiteScore: null,
    dyspneaScore: null,
    sleepDifficultyScore: null,
    wellbeingScore: null,
    heartRate: "",
    bloodPressure: "",
    respiratoryRate: "",
    temperature: "",
    painCause: "",
    painLocation: "",
    painIntensity: "",
    painType: "",
    ambulationOptionId: "",
    ambulationCauseOptionId: "",
    neurologicalLesionDetail: "",
    ecogScoreOptionId: "",
    bathroomTransferOptionId: "",
    hygieneOptionIds: [],
    mouthOptionIds: [],
    swallowingOptionId: "",
    nutritionOptionId: "",
    hydrationOptionId: "",
    hydrationRouteOptionId: "",
    abdomenOptionId: "",
    diuresisOptionId: "",
    urineOptionId: "",
    catarsisOptionIds: [],
    catarsisConsistencyOptionIds: [],
    lastCatarsisDate: "",
    respiratoryOptionId: "",
    expectorationType: "",
    hasPressureUlcers: false,
    pressureUlcerStage: "",
    pressureUlcerLocation: "",
    otherSkinLesions: "",
    hasEdemas: false,
    edemaLocation: "",
    hasOstomies: false,
    ostomyType: "",
    otherDisorders: "",
    carePlan: "",
  };
}

export function isPressureUlcerStage(
  candidate: string,
): candidate is PressureUlcerStage {
  return PRESSURE_ULCER_STAGES.some((stage) => stage === candidate);
}

export function buildPhysicalEvaluationPath(guestId: string): string {
  return `/huespedes/${guestId}/evaluacion-fisica`;
}

export const PHYSICAL_EVALUATION_CATALOG_FIELDS = {
  ambulationOptionId: { catalog: "ambulation", selectionMode: "single" },
  ambulationCauseOptionId: {
    catalog: "ambulation_cause",
    selectionMode: "single",
  },
  ecogScoreOptionId: { catalog: "ecog_score", selectionMode: "single" },
  bathroomTransferOptionId: {
    catalog: "bathroom_transfer",
    selectionMode: "single",
  },
  hygieneOptionIds: { catalog: "hygiene", selectionMode: "multiple" },
  mouthOptionIds: { catalog: "mouth", selectionMode: "multiple" },
  swallowingOptionId: { catalog: "swallowing", selectionMode: "single" },
  nutritionOptionId: { catalog: "nutrition", selectionMode: "single" },
  hydrationOptionId: { catalog: "hydration", selectionMode: "single" },
  hydrationRouteOptionId: {
    catalog: "hydration_route",
    selectionMode: "single",
  },
  abdomenOptionId: { catalog: "abdomen", selectionMode: "single" },
  diuresisOptionId: { catalog: "diuresis", selectionMode: "single" },
  urineOptionId: { catalog: "urine", selectionMode: "single" },
  catarsisOptionIds: { catalog: "catarsis", selectionMode: "multiple" },
  catarsisConsistencyOptionIds: {
    catalog: "catarsis_consistency",
    selectionMode: "multiple",
  },
  respiratoryOptionId: { catalog: "respiratory", selectionMode: "single" },
} as const satisfies Record<
  string,
  { catalog: CatalogKey; selectionMode: "single" | "multiple" }
>;

export type PhysicalEvaluationCatalogField =
  keyof typeof PHYSICAL_EVALUATION_CATALOG_FIELDS;

export const PHYSICAL_EVALUATION_CATALOG_FIELD_KEYS: readonly PhysicalEvaluationCatalogField[] =
  [
    "ambulationOptionId",
    "ambulationCauseOptionId",
    "ecogScoreOptionId",
    "bathroomTransferOptionId",
    "hygieneOptionIds",
    "mouthOptionIds",
    "swallowingOptionId",
    "nutritionOptionId",
    "hydrationOptionId",
    "hydrationRouteOptionId",
    "abdomenOptionId",
    "diuresisOptionId",
    "urineOptionId",
    "catarsisOptionIds",
    "catarsisConsistencyOptionIds",
    "respiratoryOptionId",
  ];

export function toSelectedOptionIds(
  value: string | readonly string[] | null,
): string[] {
  if (value === null) {
    return [];
  }
  if (typeof value === "string") {
    return value ? [value] : [];
  }
  return [...value];
}

export function mapPhysicalEvaluationCatalogFields<Value>(
  toValue: (field: PhysicalEvaluationCatalogField) => Value,
): Record<PhysicalEvaluationCatalogField, Value> {
  return {
    ambulationOptionId: toValue("ambulationOptionId"),
    ambulationCauseOptionId: toValue("ambulationCauseOptionId"),
    ecogScoreOptionId: toValue("ecogScoreOptionId"),
    bathroomTransferOptionId: toValue("bathroomTransferOptionId"),
    hygieneOptionIds: toValue("hygieneOptionIds"),
    mouthOptionIds: toValue("mouthOptionIds"),
    swallowingOptionId: toValue("swallowingOptionId"),
    nutritionOptionId: toValue("nutritionOptionId"),
    hydrationOptionId: toValue("hydrationOptionId"),
    hydrationRouteOptionId: toValue("hydrationRouteOptionId"),
    abdomenOptionId: toValue("abdomenOptionId"),
    diuresisOptionId: toValue("diuresisOptionId"),
    urineOptionId: toValue("urineOptionId"),
    catarsisOptionIds: toValue("catarsisOptionIds"),
    catarsisConsistencyOptionIds: toValue("catarsisConsistencyOptionIds"),
    respiratoryOptionId: toValue("respiratoryOptionId"),
  };
}
