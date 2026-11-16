"use client";

import { AlertCircleIcon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { type FormEvent, useState, useTransition } from "react";
import { toast } from "sonner";

import { DIALOG_BUTTON_CLASS_NAME } from "@/components/shared/form-styles";
import { runAction } from "@/components/shared/run-action";
import { SectionTabPanel, SectionTabs } from "@/components/shared/section-tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { FieldGroup } from "@/components/ui/field";

import {
  checkDniInActiveInterviewAction,
  createAdmissionInterviewAction,
} from "../actions";
import {
  ADDRESS_LIMITS,
  ADMISSIONS_PATH,
  type AdmissionInterviewDetailsInput,
  type AdmissionInterviewField,
  CLINICAL_TEXT_MAX_LENGTH,
  INTERVIEWEE_NAME_LIMITS,
  PERSON_NAME_LIMITS,
  RELIGION_DETAIL_MAX_LENGTH,
  SHORT_TEXT_MAX_LENGTH,
} from "../schemas";
import type { InterviewCatalogFields } from "../service";
import {
  DateInputField,
  OptionField,
  TextField,
  YesNoField,
} from "./interview-fields";

type FieldErrors = Partial<Record<string, string[]>>;

type InterviewTabId = "guest" | "interviewee" | "clinical";

const FORM_ID_PREFIX = "admission-interview";

const TAB_FIELDS: Record<InterviewTabId, AdmissionInterviewField[]> = {
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

const TAB_LABELS: Record<InterviewTabId, string> = {
  guest: "Huésped",
  interviewee: "Entrevistado y red de cuidado",
  clinical: "Condición clínica",
};

const TAB_IDS: InterviewTabId[] = ["guest", "interviewee", "clinical"];

const INVALID_FORM_MESSAGE =
  "Hay datos para corregir. Revisá las secciones marcadas.";

function fieldId(field: AdmissionInterviewField): string {
  return `${FORM_ID_PREFIX}-${field}`;
}

function hasTabErrors(tabId: InterviewTabId, fieldErrors: FieldErrors) {
  return TAB_FIELDS[tabId].some((field) => fieldErrors[field]);
}

function toSingleSelection(optionId: string): string[] {
  return optionId ? [optionId] : [];
}

function fromSingleSelection(selectedIds: string[]): string {
  return selectedIds[0] ?? "";
}

export function AdmissionInterviewForm({
  initialInterview,
  catalogFields,
  religionOtherOptionId,
  today,
}: {
  initialInterview: AdmissionInterviewDetailsInput;
  catalogFields: InterviewCatalogFields;
  religionOtherOptionId: string | null;
  today: string;
}) {
  const router = useRouter();
  const [interview, setInterview] = useState(initialInterview);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [activeTabId, setActiveTabId] = useState<InterviewTabId>("guest");
  const [hasDuplicateDni, setHasDuplicateDni] = useState(false);
  const [isSaving, startSaving] = useTransition();
  const [, startDniCheck] = useTransition();

  function update<Field extends AdmissionInterviewField>(
    field: Field,
    value: AdmissionInterviewDetailsInput[Field],
  ) {
    setInterview((current) => ({ ...current, [field]: value }));
    setFieldErrors((current) => ({ ...current, [field]: undefined }));
  }

  function textProps(field: AdmissionInterviewField) {
    return {
      id: fieldId(field),
      errors: fieldErrors[field],
    };
  }

  function checkDuplicateDni() {
    const dni = interview.guestDni;
    startDniCheck(async () => {
      try {
        setHasDuplicateDni(await checkDniInActiveInterviewAction(dni));
      } catch (error) {
        console.error("No se pudo revisar si el DNI ya estaba cargado.", error);
        setHasDuplicateDni(false);
      }
    });
  }

  function showErrors(nextFieldErrors: FieldErrors) {
    setFieldErrors(nextFieldErrors);
    const firstTabWithErrors = TAB_IDS.find((tabId) =>
      hasTabErrors(tabId, nextFieldErrors),
    );
    if (firstTabWithErrors) {
      setActiveTabId(firstTabWithErrors);
    }
    toast.error(INVALID_FORM_MESSAGE);
  }

  function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    startSaving(async () => {
      const result = await runAction(
        () => createAdmissionInterviewAction(interview),
        "Entrevista guardada.",
      );
      if (result?.status === "invalid") {
        showErrors(result.fieldErrors);
      }
      if (result?.status === "success") {
        router.push(ADMISSIONS_PATH);
      }
    });
  }

  const isReligionOther =
    religionOtherOptionId !== null &&
    interview.religionOptionId === religionOtherOptionId;

  return (
    <form onSubmit={save} noValidate className="flex flex-col gap-6">
      <SectionTabs
        idPrefix={FORM_ID_PREFIX}
        label="Secciones de la entrevista"
        tabs={TAB_IDS.map((tabId) => ({
          id: tabId,
          label: TAB_LABELS[tabId],
          hasErrors: hasTabErrors(tabId, fieldErrors),
        }))}
        activeTabId={activeTabId}
        onActiveTabChange={setActiveTabId}
      />

      <SectionTabPanel
        idPrefix={FORM_ID_PREFIX}
        tabId="guest"
        activeTabId={activeTabId}
      >
        <FieldGroup className="grid gap-x-4 gap-y-6 md:grid-cols-2 xl:grid-cols-3">
          <DateInputField
            {...textProps("interviewDate")}
            label="Fecha de entrevista"
            value={interview.interviewDate}
            onValueChange={(value) => update("interviewDate", value)}
            latestIsoDate={today}
          />
          <TextField
            {...textProps("guestFirstName")}
            label="Nombre"
            value={interview.guestFirstName}
            onValueChange={(value) => update("guestFirstName", value)}
            maxLength={PERSON_NAME_LIMITS.maxLength}
            isRequired
          />
          <TextField
            {...textProps("guestLastName")}
            label="Apellido"
            value={interview.guestLastName}
            onValueChange={(value) => update("guestLastName", value)}
            maxLength={PERSON_NAME_LIMITS.maxLength}
            isRequired
          />
          <DateInputField
            {...textProps("guestBirthDate")}
            label="Fecha de nacimiento"
            value={interview.guestBirthDate}
            onValueChange={(value) => update("guestBirthDate", value)}
            latestIsoDate={today}
          />
          <div className="flex flex-col gap-3">
            <TextField
              {...textProps("guestDni")}
              label="DNI"
              value={interview.guestDni}
              onValueChange={(value) => {
                update("guestDni", value);
                setHasDuplicateDni(false);
              }}
              onBlur={checkDuplicateDni}
              maxLength={SHORT_TEXT_MAX_LENGTH}
              isRequired
            />
            {hasDuplicateDni && (
              <Alert>
                <HugeiconsIcon icon={AlertCircleIcon} aria-hidden="true" />
                <AlertDescription className="text-base">
                  Ya hay otra entrevista vigente con este DNI. Revisá que no sea
                  la misma persona antes de guardar.
                </AlertDescription>
              </Alert>
            )}
          </div>
          <TextField
            {...textProps("guestAddress")}
            label="Dirección"
            value={interview.guestAddress}
            onValueChange={(value) => update("guestAddress", value)}
            maxLength={ADDRESS_LIMITS.maxLength}
            isRequired
          />
          <OptionField
            {...textProps("healthInsuranceOptionId")}
            label="Obra social"
            catalogField={catalogFields.healthInsurance}
            selectionMode="single"
            value={toSingleSelection(interview.healthInsuranceOptionId)}
            onValueChange={(selectedIds) =>
              update(
                "healthInsuranceOptionId",
                fromSingleSelection(selectedIds),
              )
            }
          />
          <TextField
            {...textProps("healthInsuranceMemberNumber")}
            label="Número de afiliado"
            value={interview.healthInsuranceMemberNumber}
            onValueChange={(value) =>
              update("healthInsuranceMemberNumber", value)
            }
            maxLength={SHORT_TEXT_MAX_LENGTH}
          />
          <OptionField
            {...textProps("informationAwarenessOptionId")}
            label="Información general"
            catalogField={catalogFields.informationAwareness}
            selectionMode="single"
            value={toSingleSelection(interview.informationAwarenessOptionId)}
            onValueChange={(selectedIds) =>
              update(
                "informationAwarenessOptionId",
                fromSingleSelection(selectedIds),
              )
            }
            isRequired
          />
          <OptionField
            {...textProps("religionOptionId")}
            label="Religión"
            catalogField={catalogFields.religion}
            selectionMode="single"
            value={toSingleSelection(interview.religionOptionId)}
            onValueChange={(selectedIds) =>
              update("religionOptionId", fromSingleSelection(selectedIds))
            }
            isRequired
          />
          {isReligionOther && (
            <TextField
              {...textProps("religionDetail")}
              label="Otra religión"
              value={interview.religionDetail}
              onValueChange={(value) => update("religionDetail", value)}
              maxLength={RELIGION_DETAIL_MAX_LENGTH}
              isRequired
            />
          )}
          <OptionField
            {...textProps("ecogScoreOptionId")}
            label="ECOG"
            catalogField={catalogFields.ecogScore}
            selectionMode="single"
            value={toSingleSelection(interview.ecogScoreOptionId)}
            onValueChange={(selectedIds) =>
              update("ecogScoreOptionId", fromSingleSelection(selectedIds))
            }
            isRequired
          />
          <TextField
            {...textProps("personalHistory")}
            label="Antecedentes personales"
            value={interview.personalHistory}
            onValueChange={(value) => update("personalHistory", value)}
            maxLength={CLINICAL_TEXT_MAX_LENGTH}
            isMultiline
            className="md:col-span-full"
          />
        </FieldGroup>
      </SectionTabPanel>

      <SectionTabPanel
        idPrefix={FORM_ID_PREFIX}
        tabId="interviewee"
        activeTabId={activeTabId}
      >
        <FieldGroup className="grid gap-x-4 gap-y-6 md:grid-cols-2 xl:grid-cols-3">
          <TextField
            {...textProps("intervieweeFullName")}
            label="Nombre y apellido del entrevistado"
            value={interview.intervieweeFullName}
            onValueChange={(value) => update("intervieweeFullName", value)}
            maxLength={INTERVIEWEE_NAME_LIMITS.maxLength}
            isRequired
          />
          <TextField
            {...textProps("intervieweePhone")}
            label="Teléfono"
            value={interview.intervieweePhone}
            onValueChange={(value) => update("intervieweePhone", value)}
            maxLength={SHORT_TEXT_MAX_LENGTH}
          />
          <OptionField
            {...textProps("intervieweeRelationshipOptionId")}
            label="Vínculo con el huésped"
            catalogField={catalogFields.relationship}
            selectionMode="single"
            value={toSingleSelection(interview.intervieweeRelationshipOptionId)}
            onValueChange={(selectedIds) =>
              update(
                "intervieweeRelationshipOptionId",
                fromSingleSelection(selectedIds),
              )
            }
          />
          <OptionField
            {...textProps("primaryDoctorId")}
            label="Médico de cabecera"
            catalogField={catalogFields.primaryDoctor}
            selectionMode="single"
            value={toSingleSelection(interview.primaryDoctorId)}
            onValueChange={(selectedIds) =>
              update("primaryDoctorId", fromSingleSelection(selectedIds))
            }
          />
          <TextField
            {...textProps("referredBy")}
            label="Derivado por"
            value={interview.referredBy}
            onValueChange={(value) => update("referredBy", value)}
            maxLength={CLINICAL_TEXT_MAX_LENGTH}
          />
          <TextField
            {...textProps("familyComposition")}
            label="Composición familiar"
            value={interview.familyComposition}
            onValueChange={(value) => update("familyComposition", value)}
            maxLength={CLINICAL_TEXT_MAX_LENGTH}
            isMultiline
            className="md:col-span-full"
          />
          <YesNoField
            id={fieldId("hasHomeCareDifficulties")}
            label="Dificultades para cuidar en el domicilio"
            value={interview.hasHomeCareDifficulties}
            onValueChange={(value) => update("hasHomeCareDifficulties", value)}
          />
          <YesNoField
            id={fieldId("hasFuneralService")}
            label="Servicio funerario"
            value={interview.hasFuneralService}
            onValueChange={(value) => update("hasFuneralService", value)}
          />
          <YesNoField
            id={fieldId("hasHomeCare")}
            label="Internación domiciliaria"
            value={interview.hasHomeCare}
            onValueChange={(value) => update("hasHomeCare", value)}
          />
          <YesNoField
            id={fieldId("hasEmergencyService")}
            label="Emergencia médica"
            value={interview.hasEmergencyService}
            onValueChange={(value) => update("hasEmergencyService", value)}
          />
        </FieldGroup>
      </SectionTabPanel>

      <SectionTabPanel
        idPrefix={FORM_ID_PREFIX}
        tabId="clinical"
        activeTabId={activeTabId}
      >
        <FieldGroup className="grid gap-x-4 gap-y-6 md:grid-cols-2 xl:grid-cols-3">
          <TextField
            {...textProps("tumor")}
            label="Enfermedad oncológica (tumor)"
            value={interview.tumor}
            onValueChange={(value) => update("tumor", value)}
            maxLength={CLINICAL_TEXT_MAX_LENGTH}
            isMultiline
            className="md:col-span-full"
          />
          <YesNoField
            id={fieldId("hasMetastasis")}
            label="Metástasis"
            value={interview.hasMetastasis}
            onValueChange={(value) => update("hasMetastasis", value)}
          />
          {interview.hasMetastasis && (
            <OptionField
              {...textProps("metastasisLocationOptionId")}
              label="Lugar de la metástasis"
              catalogField={catalogFields.metastasisLocation}
              selectionMode="single"
              value={toSingleSelection(interview.metastasisLocationOptionId)}
              onValueChange={(selectedIds) =>
                update(
                  "metastasisLocationOptionId",
                  fromSingleSelection(selectedIds),
                )
              }
              isRequired
            />
          )}
          <OptionField
            {...textProps("oncologicalTreatmentOptionId")}
            label="Tratamiento oncológico específico"
            catalogField={catalogFields.oncologicalTreatment}
            selectionMode="single"
            value={toSingleSelection(interview.oncologicalTreatmentOptionId)}
            onValueChange={(selectedIds) =>
              update(
                "oncologicalTreatmentOptionId",
                fromSingleSelection(selectedIds),
              )
            }
            isRequired
            className="md:col-start-1"
          />
          <TextField
            {...textProps("nonOncologicalDisease")}
            label="Enfermedad no oncológica"
            value={interview.nonOncologicalDisease}
            onValueChange={(value) => update("nonOncologicalDisease", value)}
            maxLength={CLINICAL_TEXT_MAX_LENGTH}
            isMultiline
            className="md:col-span-full"
          />
          <OptionField
            {...textProps("surgeryOptionIds")}
            label="Cirugías"
            catalogField={catalogFields.surgery}
            selectionMode="multiple"
            value={interview.surgeryOptionIds}
            onValueChange={(selectedIds) =>
              update("surgeryOptionIds", selectedIds)
            }
            className="md:col-span-full"
          />
          <TextField
            {...textProps("radiotherapy")}
            label="Radioterapia"
            value={interview.radiotherapy}
            onValueChange={(value) => update("radiotherapy", value)}
            maxLength={CLINICAL_TEXT_MAX_LENGTH}
          />
          <TextField
            {...textProps("chemotherapy")}
            label="Quimioterapia"
            value={interview.chemotherapy}
            onValueChange={(value) => update("chemotherapy", value)}
            maxLength={CLINICAL_TEXT_MAX_LENGTH}
          />
          <TextField
            {...textProps("hemotherapy")}
            label="Hemoterapia"
            value={interview.hemotherapy}
            onValueChange={(value) => update("hemotherapy", value)}
            maxLength={CLINICAL_TEXT_MAX_LENGTH}
          />
          <YesNoField
            id={fieldId("hasOpioidTreatment")}
            label="Tratamiento con opioides"
            value={interview.hasOpioidTreatment}
            onValueChange={(value) => update("hasOpioidTreatment", value)}
          />
          {interview.hasOpioidTreatment && (
            <TextField
              {...textProps("opioid")}
              label="Opioide"
              value={interview.opioid}
              onValueChange={(value) => update("opioid", value)}
              maxLength={CLINICAL_TEXT_MAX_LENGTH}
              isRequired
            />
          )}
          <TextField
            {...textProps("otherMedications")}
            label="Otros medicamentos"
            value={interview.otherMedications}
            onValueChange={(value) => update("otherMedications", value)}
            maxLength={CLINICAL_TEXT_MAX_LENGTH}
            isMultiline
            className="md:col-span-full"
          />
          <TextField
            {...textProps("complementaryStudies")}
            label="Estudios complementarios"
            value={interview.complementaryStudies}
            onValueChange={(value) => update("complementaryStudies", value)}
            maxLength={CLINICAL_TEXT_MAX_LENGTH}
            isMultiline
            className="md:col-span-full"
          />
        </FieldGroup>
      </SectionTabPanel>

      <div className="flex flex-col-reverse gap-2 border-t pt-4 sm:flex-row sm:justify-end">
        <Button asChild variant="outline" className={DIALOG_BUTTON_CLASS_NAME}>
          <Link href={ADMISSIONS_PATH}>Cancelar</Link>
        </Button>
        <Button
          type="submit"
          disabled={isSaving}
          className={DIALOG_BUTTON_CLASS_NAME}
        >
          {isSaving ? "Guardando…" : "Guardar entrevista"}
        </Button>
      </div>
    </form>
  );
}
