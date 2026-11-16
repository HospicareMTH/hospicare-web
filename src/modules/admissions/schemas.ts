import { z } from "zod";

import {
  dniSchema,
  optionalTextSchema,
  pastOrTodayDateSchema,
  requiredTextSchema,
} from "@/platform/field-validation";
import {
  type ListQuery,
  type ListSort,
  parseListQuery,
  readSearchParam,
  type SearchParams,
} from "@/platform/list-query";

export const ADMISSIONS_PATH = "/admisiones";
export const NEW_ADMISSION_INTERVIEW_PATH = "/admisiones/nueva";

export function buildAdmissionInterviewPath(interviewId: string): string {
  return `${ADMISSIONS_PATH}/${interviewId}`;
}

export function buildEditAdmissionInterviewPath(interviewId: string): string {
  return `${buildAdmissionInterviewPath(interviewId)}/editar`;
}

export const admissionInterviewIdSchema = z.uuid({
  error:
    "No encontramos esta entrevista. Volvé a Admisiones y buscala de nuevo.",
});

export const ADMISSION_INTERVIEWS_TABLE_KEY = "admission-interviews";

export const RELATIONSHIP_FILTER_PARAMETER = "vinculo";
export const PRIMARY_DOCTOR_FILTER_PARAMETER = "medico";

export const ADMISSION_INTERVIEW_SORT_KEYS = [
  "interviewDate",
  "guestName",
  "intervieweeName",
  "createdAt",
] as const;

export type AdmissionInterviewSortKey =
  (typeof ADMISSION_INTERVIEW_SORT_KEYS)[number];

export const DEFAULT_ADMISSION_INTERVIEW_SORT: ListSort<AdmissionInterviewSortKey> =
  { key: "interviewDate", isDescending: true };

export type AdmissionInterviewListQuery =
  ListQuery<AdmissionInterviewSortKey> & {
    relationshipOptionId: string | null;
    primaryDoctorId: string | null;
  };

const filterIdSchema = z.uuid();

function parseFilterId(value: string | undefined): string | null {
  const result = filterIdSchema.safeParse(value);
  return result.success ? result.data : null;
}

export const PERSON_NAME_LIMITS = { minLength: 2, maxLength: 80 };
export const ADDRESS_LIMITS = { minLength: 3, maxLength: 200 };
export const INTERVIEWEE_NAME_LIMITS = { minLength: 2, maxLength: 120 };
export const SHORT_TEXT_MAX_LENGTH = 40;
export const RELIGION_DETAIL_MAX_LENGTH = 120;
export const CLINICAL_TEXT_MAX_LENGTH = 2000;

const INVALID_OPTION_MESSAGE =
  "La opción elegida no es válida. Actualizá la pantalla.";

function requiredOptionIdSchema(missingMessage: string) {
  return z.uuid({ error: missingMessage });
}

const optionalOptionIdSchema = z
  .union([z.literal(""), z.uuid()], { error: INVALID_OPTION_MESSAGE })
  .transform((optionId) => optionId || null);

function clinicalTextSchema(fieldLabel: string) {
  return optionalTextSchema(fieldLabel, CLINICAL_TEXT_MAX_LENGTH);
}

export const admissionInterviewDetailsSchema = z
  .object({
    interviewDate: pastOrTodayDateSchema("La fecha de entrevista"),
    guestFirstName: requiredTextSchema("El nombre", PERSON_NAME_LIMITS),
    guestLastName: requiredTextSchema("El apellido", PERSON_NAME_LIMITS),
    guestBirthDate: pastOrTodayDateSchema("La fecha de nacimiento"),
    guestDni: dniSchema,
    guestAddress: requiredTextSchema("La dirección", ADDRESS_LIMITS),
    healthInsuranceOptionId: optionalOptionIdSchema,
    healthInsuranceMemberNumber: optionalTextSchema(
      "El número de afiliado",
      SHORT_TEXT_MAX_LENGTH,
    ),
    informationAwarenessOptionId: requiredOptionIdSchema(
      "Elegí la información general.",
    ),
    religionOptionId: requiredOptionIdSchema("Elegí la religión."),
    religionDetail: optionalTextSchema(
      "La otra religión",
      RELIGION_DETAIL_MAX_LENGTH,
    ),
    ecogScoreOptionId: requiredOptionIdSchema("Elegí el ECOG."),
    personalHistory: clinicalTextSchema("Los antecedentes personales"),
    intervieweeFullName: requiredTextSchema(
      "El nombre y apellido del entrevistado",
      INTERVIEWEE_NAME_LIMITS,
    ),
    intervieweePhone: optionalTextSchema("El teléfono", SHORT_TEXT_MAX_LENGTH),
    intervieweeRelationshipOptionId: optionalOptionIdSchema,
    familyComposition: clinicalTextSchema("La composición familiar"),
    referredBy: clinicalTextSchema("Derivado por"),
    primaryDoctorId: optionalOptionIdSchema,
    hasHomeCareDifficulties: z.boolean(),
    hasFuneralService: z.boolean(),
    hasHomeCare: z.boolean(),
    hasEmergencyService: z.boolean(),
    tumor: clinicalTextSchema("La enfermedad oncológica"),
    hasMetastasis: z.boolean(),
    metastasisLocationOptionId: optionalOptionIdSchema,
    oncologicalTreatmentOptionId: requiredOptionIdSchema(
      "Elegí el tratamiento oncológico específico.",
    ),
    nonOncologicalDisease: clinicalTextSchema("La enfermedad no oncológica"),
    surgeryOptionIds: z.array(z.uuid({ error: INVALID_OPTION_MESSAGE })),
    radiotherapy: clinicalTextSchema("La radioterapia"),
    chemotherapy: clinicalTextSchema("La quimioterapia"),
    hemotherapy: clinicalTextSchema("La hemoterapia"),
    hasOpioidTreatment: z.boolean(),
    opioid: clinicalTextSchema("El opioide"),
    otherMedications: clinicalTextSchema("Los otros medicamentos"),
    complementaryStudies: clinicalTextSchema("Los estudios complementarios"),
  })
  .superRefine((details, context) => {
    if (details.hasMetastasis && !details.metastasisLocationOptionId) {
      context.addIssue({
        code: "custom",
        path: ["metastasisLocationOptionId"],
        message: "Elegí el lugar de la metástasis.",
      });
    }
    if (details.hasOpioidTreatment && !details.opioid) {
      context.addIssue({
        code: "custom",
        path: ["opioid"],
        message: "Escribí qué opioide recibe.",
      });
    }
  })
  .transform((details) => ({
    ...details,
    surgeryOptionIds: [...new Set(details.surgeryOptionIds)],
    metastasisLocationOptionId: details.hasMetastasis
      ? details.metastasisLocationOptionId
      : null,
    opioid: details.hasOpioidTreatment ? details.opioid : null,
  }));

export type AdmissionInterviewDetailsInput = z.input<
  typeof admissionInterviewDetailsSchema
>;

export type AdmissionInterviewDetails = z.output<
  typeof admissionInterviewDetailsSchema
>;

export type AdmissionInterviewField = keyof AdmissionInterviewDetailsInput;

export function buildEmptyInterview(
  interviewDate: string,
): AdmissionInterviewDetailsInput {
  return {
    interviewDate,
    guestFirstName: "",
    guestLastName: "",
    guestBirthDate: "",
    guestDni: "",
    guestAddress: "",
    healthInsuranceOptionId: "",
    healthInsuranceMemberNumber: "",
    informationAwarenessOptionId: "",
    religionOptionId: "",
    religionDetail: "",
    ecogScoreOptionId: "",
    personalHistory: "",
    intervieweeFullName: "",
    intervieweePhone: "",
    intervieweeRelationshipOptionId: "",
    familyComposition: "",
    referredBy: "",
    primaryDoctorId: "",
    hasHomeCareDifficulties: false,
    hasFuneralService: false,
    hasHomeCare: false,
    hasEmergencyService: false,
    tumor: "",
    hasMetastasis: false,
    metastasisLocationOptionId: "",
    oncologicalTreatmentOptionId: "",
    nonOncologicalDisease: "",
    surgeryOptionIds: [],
    radiotherapy: "",
    chemotherapy: "",
    hemotherapy: "",
    hasOpioidTreatment: false,
    opioid: "",
    otherMedications: "",
    complementaryStudies: "",
  };
}

export function parseAdmissionInterviewListQuery(
  searchParams: SearchParams,
): AdmissionInterviewListQuery {
  return {
    ...parseListQuery(
      searchParams,
      ADMISSION_INTERVIEW_SORT_KEYS,
      DEFAULT_ADMISSION_INTERVIEW_SORT,
    ),
    relationshipOptionId: parseFilterId(
      readSearchParam(searchParams, RELATIONSHIP_FILTER_PARAMETER),
    ),
    primaryDoctorId: parseFilterId(
      readSearchParam(searchParams, PRIMARY_DOCTOR_FILTER_PARAMETER),
    ),
  };
}
