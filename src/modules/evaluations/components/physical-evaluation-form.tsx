"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { type FormEvent, type ReactNode, useState, useTransition } from "react";
import { toast } from "sonner";

import {
  ChoiceField,
  type ChoiceOption,
  DateInputField,
  INVALID_FORM_MESSAGE,
  TextField,
  YesNoField,
} from "@/components/shared/form-fields";
import { DIALOG_BUTTON_CLASS_NAME } from "@/components/shared/form-styles";
import { runAction } from "@/components/shared/run-action";
import { Button } from "@/components/ui/button";
import { FieldGroup } from "@/components/ui/field";
import { CatalogOptionField } from "@/modules/catalogs/components";

import {
  createPhysicalEvaluationAction,
  updatePhysicalEvaluationAction,
} from "../actions";
import {
  ESAS_SCORE_MARKS,
  ESAS_SCORES,
  ESAS_SYMPTOMS,
  isPressureUlcerStage,
  PAIN_DETAIL_FIELDS,
  PHYSICAL_EVALUATION_CATALOG_FIELDS,
  type PhysicalEvaluationCatalogField,
  type PhysicalEvaluationField,
  type PhysicalEvaluationInput,
  toSelectedOptionIds,
} from "../schemas";
import type { PhysicalEvaluationFormCatalogs } from "../service";
import {
  PHYSICAL_EVALUATION_LONG_TEXT_MAX_LENGTH,
  PHYSICAL_EVALUATION_SHORT_TEXT_MAX_LENGTH,
  PRESSURE_ULCER_STAGES,
  VITAL_SIGN_MAX_LENGTH,
} from "../tables";

type FieldErrors = Partial<Record<string, string[]>>;

export type PhysicalEvaluationFormMode =
  { kind: "create" } | { kind: "update"; version: string };

const FORM_ID_PREFIX = "physical-evaluation";
const FIELD_GROUP_CLASS_NAME =
  "grid gap-x-4 gap-y-6 md:grid-cols-2 xl:grid-cols-3";
const WIDE_FIELD_CLASS_NAME = "md:col-span-full";

const SAVE_TEXTS = {
  create: {
    submitLabel: "Guardar evaluación",
    successMessage: "Evaluación física de ingreso cargada.",
  },
  update: {
    submitLabel: "Guardar cambios",
    successMessage: "Guardaste los cambios.",
  },
} as const;

const ESAS_OPTIONS: readonly ChoiceOption[] = ESAS_SCORES.map((score) => {
  const mark = ESAS_SCORE_MARKS[score];
  return {
    value: String(score),
    accessibleLabel: mark ? `${score}, ${mark}` : String(score),
    label: (
      <span className="flex flex-col items-center leading-tight">
        <span className="tabular-nums">{score}</span>
        {mark && <span className="text-xs font-normal">{mark}</span>}
      </span>
    ),
  };
});

const PRESSURE_ULCER_STAGE_OPTIONS: readonly ChoiceOption[] =
  PRESSURE_ULCER_STAGES.map((stage) => ({ value: stage, label: stage }));

function fieldId(field: PhysicalEvaluationField): string {
  return `${FORM_ID_PREFIX}-${field}`;
}

function FormSection({
  id,
  title,
  description,
  children,
}: {
  id: string;
  title: string;
  description?: string;
  children: ReactNode;
}) {
  const titleId = `${FORM_ID_PREFIX}-${id}-title`;
  return (
    <section aria-labelledby={titleId} className="flex flex-col gap-4">
      <h2 id={titleId} className="text-lg font-semibold">
        {title}
      </h2>
      {description && (
        <p className="text-base text-muted-foreground">{description}</p>
      )}
      {children}
    </section>
  );
}

function FormBlock({
  id,
  title,
  children,
}: {
  id: string;
  title: string;
  children: ReactNode;
}) {
  const titleId = `${FORM_ID_PREFIX}-${id}-title`;
  return (
    <section
      aria-labelledby={titleId}
      className="flex flex-col gap-4 border-t pt-6"
    >
      <h3 id={titleId} className="text-base font-semibold">
        {title}
      </h3>
      <FieldGroup className={FIELD_GROUP_CLASS_NAME}>{children}</FieldGroup>
    </section>
  );
}

// Next conserva el estado de la pantalla al salir (Activity): entrar de nuevo o editar otra versión arranca de cero.
export function PhysicalEvaluationForm(
  props: Parameters<typeof PhysicalEvaluationFormContent>[0],
) {
  const { bfcacheId } = useRouter();
  const versionKey =
    props.mode.kind === "update" ? props.mode.version : props.mode.kind;
  return (
    <PhysicalEvaluationFormContent
      key={`${bfcacheId}-${versionKey}`}
      {...props}
    />
  );
}

function PhysicalEvaluationFormContent({
  guestId,
  mode,
  initialEvaluation,
  catalogs,
  today,
  returnHref,
}: {
  guestId: string;
  mode: PhysicalEvaluationFormMode;
  initialEvaluation: PhysicalEvaluationInput;
  catalogs: PhysicalEvaluationFormCatalogs;
  today: string;
  returnHref: string;
}) {
  const router = useRouter();
  const [evaluation, setEvaluation] = useState(initialEvaluation);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [isSaving, startSaving] = useTransition();
  const texts = SAVE_TEXTS[mode.kind];
  const hasPain = evaluation.painScore !== null && evaluation.painScore > 0;
  const isNeurologicalLesion =
    catalogs.neurologicalLesionCauseOptionId !== null &&
    evaluation.ambulationCauseOptionId ===
      catalogs.neurologicalLesionCauseOptionId;

  function update<Field extends PhysicalEvaluationField>(
    field: Field,
    value: PhysicalEvaluationInput[Field],
  ) {
    setEvaluation((current) => ({ ...current, [field]: value }));
    setFieldErrors((current) => ({ ...current, [field]: undefined }));
  }

  function fieldProps(field: PhysicalEvaluationField) {
    return { id: fieldId(field), errors: fieldErrors[field] };
  }

  function textFieldProps(
    field: Extract<
      PhysicalEvaluationField,
      | "heartRate"
      | "bloodPressure"
      | "respiratoryRate"
      | "temperature"
      | "painCause"
      | "painLocation"
      | "painIntensity"
      | "painType"
      | "neurologicalLesionDetail"
      | "expectorationType"
      | "pressureUlcerLocation"
      | "otherSkinLesions"
      | "edemaLocation"
      | "ostomyType"
      | "otherDisorders"
      | "carePlan"
    >,
    maxLength: number,
  ) {
    return {
      ...fieldProps(field),
      value: evaluation[field],
      onValueChange: (value: string) => update(field, value),
      maxLength,
    };
  }

  function catalogField(field: PhysicalEvaluationCatalogField, label: string) {
    const { selectionMode } = PHYSICAL_EVALUATION_CATALOG_FIELDS[field];
    return (
      <CatalogOptionField
        {...fieldProps(field)}
        label={label}
        catalogField={catalogs.fields[field]}
        selectionMode={selectionMode}
        value={toSelectedOptionIds(evaluation[field])}
        onValueChange={(selectedIds) => {
          if (selectionMode === "single") {
            update(field, selectedIds[0] ?? "");
            return;
          }
          update(field, selectedIds);
        }}
        className={
          selectionMode === "multiple" ? WIDE_FIELD_CLASS_NAME : undefined
        }
      />
    );
  }

  function save() {
    return mode.kind === "create"
      ? createPhysicalEvaluationAction(guestId, evaluation)
      : updatePhysicalEvaluationAction(guestId, mode.version, evaluation);
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    startSaving(async () => {
      const result = await runAction(save, texts.successMessage);
      if (result?.status === "invalid") {
        setFieldErrors(result.fieldErrors);
        toast.error(INVALID_FORM_MESSAGE);
      }
      if (result?.status === "success") {
        router.push(returnHref);
      }
    });
  }

  return (
    <form onSubmit={submit} noValidate className="flex flex-col gap-10">
      <FieldGroup className={FIELD_GROUP_CLASS_NAME}>
        <DateInputField
          {...fieldProps("evaluationDate")}
          label="Fecha de la evaluación"
          value={evaluation.evaluationDate}
          onValueChange={(value) => update("evaluationDate", value)}
          latestIsoDate={today}
        />
      </FieldGroup>

      <FormSection
        id="esas"
        title="Escala de síntomas (ESAS)"
        description="Elegí para cada síntoma un puntaje de 0 (nada) a 10 (mucho)."
      >
        <FieldGroup className="gap-0">
          {ESAS_SYMPTOMS.map(({ key, label }) => (
            <ChoiceField
              key={key}
              {...fieldProps(key)}
              label={label}
              options={ESAS_OPTIONS}
              value={evaluation[key] === null ? "" : String(evaluation[key])}
              onValueChange={(value) => update(key, Number(value))}
              isRequired
              className="border-b py-4 last:border-b-0 xl:grid xl:grid-cols-[12rem_1fr] xl:items-center xl:gap-x-4"
              groupClassName="grid w-full grid-cols-6 gap-1 sm:grid-cols-11"
              itemClassName="h-12 w-full min-w-0 px-0"
            />
          ))}
        </FieldGroup>
      </FormSection>

      <FormSection id="nursing" title="Evaluación de ingreso de enfermería">
        <FormBlock id="vital-signs" title="Signos vitales">
          <TextField
            {...textFieldProps("heartRate", VITAL_SIGN_MAX_LENGTH)}
            label="Frecuencia cardíaca"
          />
          <TextField
            {...textFieldProps("bloodPressure", VITAL_SIGN_MAX_LENGTH)}
            label="Presión arterial"
          />
          <TextField
            {...textFieldProps("respiratoryRate", VITAL_SIGN_MAX_LENGTH)}
            label="Frecuencia respiratoria"
          />
          <TextField
            {...textFieldProps("temperature", VITAL_SIGN_MAX_LENGTH)}
            label="Temperatura"
          />
        </FormBlock>

        <FormBlock id="pain" title="Dolor">
          {hasPain ? (
            PAIN_DETAIL_FIELDS.map(({ key, label }) => (
              <TextField
                key={key}
                {...textFieldProps(
                  key,
                  PHYSICAL_EVALUATION_SHORT_TEXT_MAX_LENGTH,
                )}
                label={label}
                isRequired
              />
            ))
          ) : (
            <p className="text-base text-muted-foreground md:col-span-full">
              Se completa cuando el dolor de la ESAS es mayor que 0.
            </p>
          )}
        </FormBlock>

        <FormBlock id="mobility" title="Movilidad">
          {catalogField("ambulationOptionId", "Deambulación")}
          {catalogField("ambulationCauseOptionId", "Causa de la deambulación")}
          {isNeurologicalLesion && (
            <TextField
              {...textFieldProps(
                "neurologicalLesionDetail",
                PHYSICAL_EVALUATION_SHORT_TEXT_MAX_LENGTH,
              )}
              label="Detalle de la lesión neurológica"
              isRequired
            />
          )}
          {catalogField("ecogScoreOptionId", "ECOG")}
          {catalogField("bathroomTransferOptionId", "Traslado al baño")}
        </FormBlock>

        <FormBlock id="personal-care" title="Cuidado personal">
          {catalogField("hygieneOptionIds", "Higiene")}
          {catalogField("mouthOptionIds", "Boca")}
        </FormBlock>

        <FormBlock id="feeding" title="Alimentación">
          {catalogField("swallowingOptionId", "Deglución")}
          {catalogField("nutritionOptionId", "Nutrición")}
          {catalogField("hydrationOptionId", "Hidratación")}
          {catalogField("hydrationRouteOptionId", "Forma de hidratación")}
          {catalogField("abdomenOptionId", "Abdomen")}
        </FormBlock>

        <FormBlock id="elimination" title="Eliminación">
          {catalogField("diuresisOptionId", "Diuresis")}
          {catalogField("urineOptionId", "Orinas")}
          <DateInputField
            {...fieldProps("lastCatarsisDate")}
            label="Fecha de la última catarsis"
            value={evaluation.lastCatarsisDate}
            onValueChange={(value) => update("lastCatarsisDate", value)}
            latestIsoDate={today}
            isRequired={false}
          />
          {catalogField("catarsisOptionIds", "Catarsis")}
          {catalogField(
            "catarsisConsistencyOptionIds",
            "Consistencia de la catarsis",
          )}
        </FormBlock>

        <FormBlock id="respiratory" title="Respiratorio">
          {catalogField("respiratoryOptionId", "Aparato respiratorio")}
          <TextField
            {...textFieldProps(
              "expectorationType",
              PHYSICAL_EVALUATION_SHORT_TEXT_MAX_LENGTH,
            )}
            label="Tipo de expectoración"
          />
        </FormBlock>

        <FormBlock id="skin" title="Piel">
          <YesNoField
            {...fieldProps("hasPressureUlcers")}
            label="Úlceras por presión"
            value={evaluation.hasPressureUlcers}
            onValueChange={(value) => update("hasPressureUlcers", value)}
          />
          {evaluation.hasPressureUlcers && (
            <>
              <ChoiceField
                {...fieldProps("pressureUlcerStage")}
                label="Estadio"
                options={PRESSURE_ULCER_STAGE_OPTIONS}
                value={evaluation.pressureUlcerStage}
                onValueChange={(value) => {
                  if (isPressureUlcerStage(value)) {
                    update("pressureUlcerStage", value);
                  }
                }}
                isRequired
                itemClassName="w-12 px-0"
              />
              <TextField
                {...textFieldProps(
                  "pressureUlcerLocation",
                  PHYSICAL_EVALUATION_SHORT_TEXT_MAX_LENGTH,
                )}
                label="Lugar de las úlceras"
                isRequired
              />
            </>
          )}
          <TextField
            {...textFieldProps(
              "otherSkinLesions",
              PHYSICAL_EVALUATION_LONG_TEXT_MAX_LENGTH,
            )}
            label="Otras lesiones de piel"
            isMultiline
            className={WIDE_FIELD_CLASS_NAME}
          />
        </FormBlock>

        <FormBlock id="others" title="Otros">
          <YesNoField
            {...fieldProps("hasEdemas")}
            label="Edemas"
            value={evaluation.hasEdemas}
            onValueChange={(value) => update("hasEdemas", value)}
          />
          {evaluation.hasEdemas && (
            <TextField
              {...textFieldProps(
                "edemaLocation",
                PHYSICAL_EVALUATION_SHORT_TEXT_MAX_LENGTH,
              )}
              label="Lugar de los edemas"
              isRequired
            />
          )}
          <YesNoField
            {...fieldProps("hasOstomies")}
            label="Ostomías"
            value={evaluation.hasOstomies}
            onValueChange={(value) => update("hasOstomies", value)}
          />
          {evaluation.hasOstomies && (
            <TextField
              {...textFieldProps(
                "ostomyType",
                PHYSICAL_EVALUATION_SHORT_TEXT_MAX_LENGTH,
              )}
              label="Tipo de ostomía"
              isRequired
            />
          )}
          <TextField
            {...textFieldProps(
              "otherDisorders",
              PHYSICAL_EVALUATION_LONG_TEXT_MAX_LENGTH,
            )}
            label="Otros trastornos"
            isMultiline
            className={WIDE_FIELD_CLASS_NAME}
          />
          <TextField
            {...textFieldProps(
              "carePlan",
              PHYSICAL_EVALUATION_LONG_TEXT_MAX_LENGTH,
            )}
            label="Plan de cuidados"
            isMultiline
            className={WIDE_FIELD_CLASS_NAME}
          />
        </FormBlock>
      </FormSection>

      <div className="flex flex-col-reverse gap-2 border-t pt-4 sm:flex-row sm:justify-end">
        <Button asChild variant="outline" className={DIALOG_BUTTON_CLASS_NAME}>
          <Link href={returnHref}>Cancelar</Link>
        </Button>
        <Button
          type="submit"
          disabled={isSaving}
          className={DIALOG_BUTTON_CLASS_NAME}
        >
          {isSaving ? "Guardando…" : texts.submitLabel}
        </Button>
      </div>
    </form>
  );
}
