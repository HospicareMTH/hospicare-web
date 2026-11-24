"use client";

import { useState } from "react";

import { type DetailItem, DetailList } from "@/components/shared/detail-list";
import { SectionTabPanel, SectionTabs } from "@/components/shared/section-tabs";
import { formatIsoDate } from "@/platform/dates";
import { formatDni } from "@/platform/dni";

import type { AdmissionInterviewDetailsInput } from "../schemas";
import type { CatalogFieldData } from "@/modules/catalogs";

import type { InterviewCatalogFields } from "../service";
import {
  INTERVIEW_SECTION_IDS,
  INTERVIEW_SECTION_LABELS,
  INTERVIEW_SECTIONS_LABEL,
  type InterviewSectionId,
  YES_NO_FIELD_LABELS,
} from "./interview-sections";

const DETAIL_ID_PREFIX = "admission-interview-detail";
const YES_LABEL = "Sí";
const NO_LABEL = "No";

function textValue(text: string): string {
  return text.trim();
}

function yesNoValue(value: boolean): string {
  return value ? YES_LABEL : NO_LABEL;
}

function optionLabels(
  catalogField: CatalogFieldData,
  selectedIds: string[],
): string {
  return catalogField.options
    .filter((option) => selectedIds.includes(option.id))
    .map((option) => option.label)
    .join(", ");
}

function singleOptionLabel(
  catalogField: CatalogFieldData,
  optionId: string,
): string {
  return optionId ? optionLabels(catalogField, [optionId]) : "";
}

function buildSectionItems(
  interview: AdmissionInterviewDetailsInput,
  catalogFields: InterviewCatalogFields,
  isReligionOther: boolean,
): Record<InterviewSectionId, DetailItem[]> {
  return {
    guest: [
      {
        label: "Fecha de entrevista",
        value: formatIsoDate(interview.interviewDate),
      },
      { label: "Nombre", value: interview.guestFirstName },
      { label: "Apellido", value: interview.guestLastName },
      {
        label: "Fecha de nacimiento",
        value: formatIsoDate(interview.guestBirthDate),
      },
      { label: "DNI", value: formatDni(interview.guestDni) },
      { label: "Dirección", value: interview.guestAddress },
      {
        label: "Obra social",
        value: singleOptionLabel(
          catalogFields.healthInsurance,
          interview.healthInsuranceOptionId,
        ),
      },
      {
        label: "Número de afiliado",
        value: textValue(interview.healthInsuranceMemberNumber),
      },
      {
        label: "Información general",
        value: singleOptionLabel(
          catalogFields.informationAwareness,
          interview.informationAwarenessOptionId,
        ),
      },
      {
        label: "Religión",
        value: isReligionOther
          ? `${singleOptionLabel(catalogFields.religion, interview.religionOptionId)}: ${interview.religionDetail}`
          : singleOptionLabel(
              catalogFields.religion,
              interview.religionOptionId,
            ),
      },
      {
        label: "ECOG",
        value: singleOptionLabel(
          catalogFields.ecogScore,
          interview.ecogScoreOptionId,
        ),
      },
      {
        label: "Antecedentes personales",
        value: textValue(interview.personalHistory),
        isWide: true,
      },
    ],
    interviewee: [
      {
        label: "Nombre y apellido del entrevistado",
        value: interview.intervieweeFullName,
      },
      { label: "Teléfono", value: textValue(interview.intervieweePhone) },
      {
        label: "Vínculo con el huésped",
        value: singleOptionLabel(
          catalogFields.relationship,
          interview.intervieweeRelationshipOptionId,
        ),
      },
      {
        label: "Médico de cabecera",
        value: singleOptionLabel(
          catalogFields.primaryDoctor,
          interview.primaryDoctorId,
        ),
      },
      { label: "Derivado por", value: textValue(interview.referredBy) },
      {
        label: "Composición familiar",
        value: textValue(interview.familyComposition),
        isWide: true,
      },
      {
        label: YES_NO_FIELD_LABELS.hasHomeCareDifficulties,
        value: yesNoValue(interview.hasHomeCareDifficulties),
      },
      {
        label: YES_NO_FIELD_LABELS.hasFuneralService,
        value: yesNoValue(interview.hasFuneralService),
      },
      {
        label: YES_NO_FIELD_LABELS.hasHomeCare,
        value: yesNoValue(interview.hasHomeCare),
      },
      {
        label: YES_NO_FIELD_LABELS.hasEmergencyService,
        value: yesNoValue(interview.hasEmergencyService),
      },
    ],
    clinical: [
      {
        label: "Enfermedad oncológica (tumor)",
        value: textValue(interview.tumor),
        isWide: true,
      },
      {
        label: YES_NO_FIELD_LABELS.hasMetastasis,
        value: interview.hasMetastasis
          ? `${YES_LABEL}: ${singleOptionLabel(catalogFields.metastasisLocation, interview.metastasisLocationOptionId)}`
          : NO_LABEL,
      },
      {
        label: "Tratamiento oncológico específico",
        value: singleOptionLabel(
          catalogFields.oncologicalTreatment,
          interview.oncologicalTreatmentOptionId,
        ),
      },
      {
        label: "Enfermedad no oncológica",
        value: textValue(interview.nonOncologicalDisease),
        isWide: true,
      },
      {
        label: "Cirugías",
        value: optionLabels(catalogFields.surgery, interview.surgeryOptionIds),
        isWide: true,
      },
      { label: "Radioterapia", value: textValue(interview.radiotherapy) },
      { label: "Quimioterapia", value: textValue(interview.chemotherapy) },
      { label: "Hemoterapia", value: textValue(interview.hemotherapy) },
      {
        label: YES_NO_FIELD_LABELS.hasOpioidTreatment,
        value: interview.hasOpioidTreatment
          ? `${YES_LABEL}: ${interview.opioid}`
          : NO_LABEL,
      },
      {
        label: "Otros medicamentos",
        value: textValue(interview.otherMedications),
        isWide: true,
      },
      {
        label: "Estudios complementarios",
        value: textValue(interview.complementaryStudies),
        isWide: true,
      },
    ],
  };
}

export function AdmissionInterviewDetail({
  interview,
  catalogFields,
  religionOtherOptionId,
}: {
  interview: AdmissionInterviewDetailsInput;
  catalogFields: InterviewCatalogFields;
  religionOtherOptionId: string | null;
}) {
  const [activeSectionId, setActiveSectionId] =
    useState<InterviewSectionId>("guest");
  const sectionItems = buildSectionItems(
    interview,
    catalogFields,
    religionOtherOptionId !== null &&
      interview.religionOptionId === religionOtherOptionId,
  );

  return (
    <div className="flex flex-col gap-6">
      <SectionTabs
        idPrefix={DETAIL_ID_PREFIX}
        label={INTERVIEW_SECTIONS_LABEL}
        tabs={INTERVIEW_SECTION_IDS.map((sectionId) => ({
          id: sectionId,
          label: INTERVIEW_SECTION_LABELS[sectionId],
          hasErrors: false,
        }))}
        activeTabId={activeSectionId}
        onActiveTabChange={setActiveSectionId}
      />
      {INTERVIEW_SECTION_IDS.map((sectionId) => (
        <SectionTabPanel
          key={sectionId}
          idPrefix={DETAIL_ID_PREFIX}
          tabId={sectionId}
          activeTabId={activeSectionId}
        >
          <DetailList items={sectionItems[sectionId]} />
        </SectionTabPanel>
      ))}
    </div>
  );
}
