"use client";

import { type FormEvent, useId, useState, useTransition } from "react";

import {
  DateInputField,
  errorDescriptionId,
  YesNoField,
} from "@/components/shared/form-fields";
import { DIALOG_BUTTON_CLASS_NAME } from "@/components/shared/form-styles";
import { runAction } from "@/components/shared/run-action";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Textarea } from "@/components/ui/textarea";

import {
  createCamEvaluationAction,
  updateCamEvaluationAction,
} from "../actions";
import {
  assessCamCriteria,
  CAM_CRITERIA,
  type CamCriterionKey,
  type CamEvaluationInput,
  describeCamResult,
  listReachedCamCriteria,
} from "../schemas";
import { CAM_OBSERVATIONS_MAX_LENGTH } from "../tables";

type FieldErrors = Record<string, string[] | undefined>;

export type CamEvaluationDialogMode =
  { kind: "create" } | { kind: "update"; version: string };

const DIALOG_TEXTS = {
  create: {
    titlePrefix: "Cargar la evaluación CAM de",
    submitLabel: "Guardar evaluación",
    successMessage: "Evaluación CAM cargada.",
  },
  update: {
    titlePrefix: "Modificar la evaluación CAM de",
    submitLabel: "Guardar cambios",
    successMessage: "Guardaste los cambios.",
  },
} as const;

const PENDING_RESULT_TEXT =
  "El resultado aparece cuando respondas los criterios.";

function ResultPreview({ evaluation }: { evaluation: CamEvaluationInput }) {
  const assessment = assessCamCriteria(evaluation);
  return (
    <p
      aria-live="polite"
      className="rounded-md bg-muted px-3 py-2 text-base text-muted-foreground"
    >
      {assessment ? (
        <>
          Resultado:{" "}
          <span className="font-semibold text-foreground">
            {describeCamResult(assessment.isDeliriumLikely)}
          </span>
        </>
      ) : (
        PENDING_RESULT_TEXT
      )}
    </p>
  );
}

export function CamEvaluationDialog({
  guestId,
  guestFullName,
  mode,
  initialEvaluation,
  today,
  onClose,
}: {
  guestId: string;
  guestFullName: string;
  mode: CamEvaluationDialogMode;
  initialEvaluation: CamEvaluationInput;
  today: string;
  onClose: () => void;
}) {
  const [evaluation, setEvaluation] = useState(initialEvaluation);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [isSaving, startSaving] = useTransition();
  const formId = useId();
  const fieldIdPrefix = useId();
  const texts = DIALOG_TEXTS[mode.kind];
  const reachedCriteria = listReachedCamCriteria(evaluation);
  const observationsId = `${fieldIdPrefix}-observations`;
  const observationsHintId = `${observationsId}-hint`;

  function changeField<Key extends keyof CamEvaluationInput>(
    key: Key,
    value: CamEvaluationInput[Key],
  ) {
    setEvaluation((current) => ({ ...current, [key]: value }));
    setFieldErrors((current) => ({ ...current, [key]: undefined }));
  }

  function save() {
    return mode.kind === "create"
      ? createCamEvaluationAction(guestId, evaluation)
      : updateCamEvaluationAction(guestId, mode.version, evaluation);
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    startSaving(async () => {
      const result = await runAction(save, texts.successMessage);
      if (result?.status === "invalid") {
        setFieldErrors(result.fieldErrors);
      }
      if (result?.status === "success") {
        onClose();
      }
    });
  }

  return (
    <Dialog open onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="max-h-[calc(100svh-2rem)] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle className="text-lg">
            {texts.titlePrefix} {guestFullName}
          </DialogTitle>
          <DialogDescription className="text-base">
            Respondé los criterios en orden. Si no hay comienzo agudo o no hay
            inatención, la evaluación termina ahí.
          </DialogDescription>
        </DialogHeader>
        <form id={formId} onSubmit={submit} noValidate>
          <FieldGroup>
            <DateInputField
              id={`${fieldIdPrefix}-date`}
              label="Fecha de la evaluación"
              value={evaluation.evaluationDate}
              onValueChange={(value) => changeField("evaluationDate", value)}
              latestIsoDate={today}
              errors={fieldErrors.evaluationDate}
            />
            {CAM_CRITERIA.filter(({ key }) =>
              reachedCriteria.includes(key),
            ).map(({ key, label, question }) => (
              <YesNoField
                key={key}
                id={`${fieldIdPrefix}-${key}`}
                label={label}
                description={question}
                value={evaluation[key]}
                onValueChange={(value) =>
                  changeField<CamCriterionKey>(key, value)
                }
                isRequired
                errors={fieldErrors[key]}
              />
            ))}
            <ResultPreview evaluation={evaluation} />
            <Field data-invalid={fieldErrors.observations ? true : undefined}>
              <FieldLabel htmlFor={observationsId} className="text-base">
                Observaciones
              </FieldLabel>
              <Textarea
                id={observationsId}
                value={evaluation.observations}
                onChange={(event) =>
                  changeField("observations", event.target.value)
                }
                maxLength={CAM_OBSERVATIONS_MAX_LENGTH}
                aria-invalid={fieldErrors.observations ? true : undefined}
                aria-describedby={[
                  observationsHintId,
                  fieldErrors.observations
                    ? errorDescriptionId(observationsId)
                    : null,
                ]
                  .filter((elementId) => elementId !== null)
                  .join(" ")}
                className="min-h-20 text-base md:text-base"
              />
              <FieldDescription id={observationsHintId}>
                Hasta {CAM_OBSERVATIONS_MAX_LENGTH} caracteres.
              </FieldDescription>
              <FieldError
                id={errorDescriptionId(observationsId)}
                errors={fieldErrors.observations?.map((message) => ({
                  message,
                }))}
              />
            </Field>
          </FieldGroup>
        </form>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline" className={DIALOG_BUTTON_CLASS_NAME}>
              Cancelar
            </Button>
          </DialogClose>
          <Button
            type="submit"
            form={formId}
            disabled={isSaving}
            className={DIALOG_BUTTON_CLASS_NAME}
          >
            {isSaving ? "Guardando…" : texts.submitLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
