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
  updateAdmissionInterviewAction,
} from "../actions";
import {
  ADDRESS_LIMITS,
  ADMISSIONS_PATH,
  buildAdmissionInterviewPath,
  type AdmissionInterviewDetailsInput,
  type AdmissionInterviewField,
  CLINICAL_TEXT_MAX_LENGTH,
  INTERVIEWEE_NAME_LIMITS,
  PERSON_NAME_LIMITS,
  RELIGION_DETAIL_MAX_LENGTH,
  SHORT_TEXT_MAX_LENGTH,
} from "../schemas";
import type {
  CreateAdmissionInterviewResult,
  InterviewCatalogFields,
} from "../service";
import {
  DateInputField,
  OptionField,
  TextField,
  YesNoField,
} from "./interview-fields";
import {
  INTERVIEW_SECTION_FIELDS,
  INTERVIEW_SECTION_IDS,
  INTERVIEW_SECTION_LABELS,
  INTERVIEW_SECTIONS_LABEL,
  type InterviewSectionId,
  YES_NO_FIELD_LABELS,
} from "./interview-sections";

type FieldErrors = Partial<Record<string, string[]>>;

type FormMode =
  { kind: "create" } | { kind: "edit"; interviewId: string; version: string };

const FORM_ID_PREFIX = "admission-interview";

const INVALID_FORM_MESSAGE =
  "Hay datos para corregir. Revisá las secciones marcadas.";

function fieldId(field: AdmissionInterviewField): string {
  return `${FORM_ID_PREFIX}-${field}`;
}

function hasTabErrors(sectionId: InterviewSectionId, fieldErrors: FieldErrors) {
  return INTERVIEW_SECTION_FIELDS[sectionId].some(
    (field) => fieldErrors[field],
  );
}

function toSingleSelection(optionId: string): string[] {
  return optionId ? [optionId] : [];
}

function fromSingleSelection(selectedIds: string[]): string {
  return selectedIds[0] ?? "";
}

async function saveInterview(
  mode: FormMode,
  interview: AdmissionInterviewDetailsInput,
): Promise<CreateAdmissionInterviewResult | null> {
  if (mode.kind === "create") {
    return runAction(
      () => createAdmissionInterviewAction(interview),
      "Entrevista guardada.",
    );
  }
  const result = await runAction(
    () =>
      updateAdmissionInterviewAction(mode.interviewId, mode.version, interview),
    "Cambios guardados.",
  );
  return result?.status === "success"
    ? { status: "success", interviewId: mode.interviewId }
    : result;
}

type AdmissionInterviewFormProps = {
  mode: FormMode;
  initialInterview: AdmissionInterviewDetailsInput;
  catalogFields: InterviewCatalogFields;
  religionOtherOptionId: string | null;
  today: string;
};

const NEW_INTERVIEW_KEY = "new";

// Next conserva el estado de la pantalla al salir (Activity): entrar con un clic o editar otra versión arranca de cero.
export function AdmissionInterviewForm(props: AdmissionInterviewFormProps) {
  const { bfcacheId } = useRouter();
  const contentKey =
    props.mode.kind === "edit" ? props.mode.version : NEW_INTERVIEW_KEY;
  return (
    <AdmissionInterviewFormContent
      key={`${bfcacheId}-${contentKey}`}
      {...props}
    />
  );
}

function AdmissionInterviewFormContent({
  mode,
  initialInterview,
  catalogFields,
  religionOtherOptionId,
  today,
}: AdmissionInterviewFormProps) {
  const router = useRouter();
  const [interview, setInterview] = useState(initialInterview);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [activeTabId, setActiveTabId] = useState<InterviewSectionId>("guest");
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
        setHasDuplicateDni(
          await checkDniInActiveInterviewAction(
            dni,
            mode.kind === "edit" ? mode.interviewId : null,
          ),
        );
      } catch (error) {
        console.error("No se pudo revisar si el DNI ya estaba cargado.", error);
        setHasDuplicateDni(false);
      }
    });
  }

  function showErrors(nextFieldErrors: FieldErrors) {
    setFieldErrors(nextFieldErrors);
    const firstTabWithErrors = INTERVIEW_SECTION_IDS.find((tabId) =>
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
      const result = await saveInterview(mode, interview);
      if (result?.status === "invalid") {
        showErrors(result.fieldErrors);
      }
      if (result?.status !== "success") {
        return;
      }
      router.push(buildAdmissionInterviewPath(result.interviewId));
    });
  }

  const cancelPath =
    mode.kind === "edit"
      ? buildAdmissionInterviewPath(mode.interviewId)
      : ADMISSIONS_PATH;
  const isReligionOther =
    religionOtherOptionId !== null &&
    interview.religionOptionId === religionOtherOptionId;

  return (
    <form onSubmit={save} noValidate className="flex flex-col gap-6">
      <SectionTabs
        idPrefix={FORM_ID_PREFIX}
        label={INTERVIEW_SECTIONS_LABEL}
        tabs={INTERVIEW_SECTION_IDS.map((tabId) => ({
          id: tabId,
          label: INTERVIEW_SECTION_LABELS[tabId],
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
            label={YES_NO_FIELD_LABELS.hasHomeCareDifficulties}
            value={interview.hasHomeCareDifficulties}
            onValueChange={(value) => update("hasHomeCareDifficulties", value)}
          />
          <YesNoField
            id={fieldId("hasFuneralService")}
            label={YES_NO_FIELD_LABELS.hasFuneralService}
            value={interview.hasFuneralService}
            onValueChange={(value) => update("hasFuneralService", value)}
          />
          <YesNoField
            id={fieldId("hasHomeCare")}
            label={YES_NO_FIELD_LABELS.hasHomeCare}
            value={interview.hasHomeCare}
            onValueChange={(value) => update("hasHomeCare", value)}
          />
          <YesNoField
            id={fieldId("hasEmergencyService")}
            label={YES_NO_FIELD_LABELS.hasEmergencyService}
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
            label={YES_NO_FIELD_LABELS.hasMetastasis}
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
            label={YES_NO_FIELD_LABELS.hasOpioidTreatment}
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
          <Link href={cancelPath}>Cancelar</Link>
        </Button>
        <Button
          type="submit"
          disabled={isSaving}
          className={DIALOG_BUTTON_CLASS_NAME}
        >
          {isSaving
            ? "Guardando…"
            : mode.kind === "edit"
              ? "Guardar cambios"
              : "Guardar entrevista"}
        </Button>
      </div>
    </form>
  );
}
