import { z } from "zod";

import {
  optionalTextSchema,
  pastOrTodayDateSchema,
} from "@/platform/field-validation";

import {
  CAM_OBSERVATIONS_MAX_LENGTH,
  type CamStoppingCriterion,
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
