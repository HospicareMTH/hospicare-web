import type { AdmissionInterviewField } from "../schemas";

export type InterviewSectionId = "guest" | "interviewee" | "clinical";

export const INTERVIEW_SECTION_IDS: InterviewSectionId[] = [
  "guest",
  "interviewee",
  "clinical",
];

export const INTERVIEW_SECTION_LABELS: Record<InterviewSectionId, string> = {
  guest: "Huésped",
  interviewee: "Entrevistado y red de cuidado",
  clinical: "Condición clínica",
};

export const INTERVIEW_SECTIONS_LABEL = "Secciones de la entrevista";

export const INTERVIEW_SECTION_FIELDS: Record<
  InterviewSectionId,
  AdmissionInterviewField[]
> = {
  guest: [
    "interviewDate",
    "guestFirstName",
    "guestLastName",
    "guestBirthDate",
    "guestDni",
    "guestAddress",
    "healthInsuranceOptionId",
    "healthInsuranceMemberNumber",
    "informationAwarenessOptionId",
    "religionOptionId",
    "religionDetail",
    "ecogScoreOptionId",
    "personalHistory",
  ],
  interviewee: [
    "intervieweeFullName",
    "intervieweePhone",
    "intervieweeRelationshipOptionId",
    "primaryDoctorId",
    "referredBy",
    "familyComposition",
  ],
  clinical: [
    "tumor",
    "metastasisLocationOptionId",
    "oncologicalTreatmentOptionId",
    "nonOncologicalDisease",
    "surgeryOptionIds",
    "radiotherapy",
    "chemotherapy",
    "hemotherapy",
    "opioid",
    "otherMedications",
    "complementaryStudies",
  ],
};

export const YES_NO_FIELD_LABELS = {
  hasHomeCareDifficulties: "Dificultades para cuidar en el domicilio",
  hasFuneralService: "Servicio funerario",
  hasHomeCare: "Internación domiciliaria",
  hasEmergencyService: "Emergencia médica",
  hasMetastasis: "Metástasis",
  hasOpioidTreatment: "Tratamiento con opioides",
} as const;
