import type { ReactNode } from "react";

import { type DetailItem, DetailList } from "@/components/shared/detail-list";
import { formatIsoDate } from "@/platform/dates";

import {
  ESAS_SCORE_MARKS,
  ESAS_SYMPTOMS,
  PAIN_DETAIL_FIELDS,
  type PhysicalEvaluationCatalogField,
} from "../schemas";
import type { PhysicalEvaluationView } from "../service";

const BLOCK_TITLE_ID_PREFIX = "physical-evaluation-detail";

function describeScore(score: number | null): string {
  if (score === null) {
    return "";
  }
  const mark = ESAS_SCORE_MARKS[score];
  return mark ? `${score} (${mark})` : String(score);
}

function describeYesNo(value: boolean): string {
  return value ? "Sí" : "No";
}

function DetailBlock({
  id,
  title,
  children,
}: {
  id: string;
  title: string;
  children: ReactNode;
}) {
  const titleId = `${BLOCK_TITLE_ID_PREFIX}-${id}-title`;
  return (
    <section
      aria-labelledby={titleId}
      className="flex flex-col gap-4 border-t pt-6"
    >
      <h3 id={titleId} className="text-base font-semibold">
        {title}
      </h3>
      {children}
    </section>
  );
}

export function PhysicalEvaluationDetail({
  evaluation,
}: {
  evaluation: PhysicalEvaluationView;
}) {
  const { input, optionLabels } = evaluation;
  const labelsOf = (field: PhysicalEvaluationCatalogField) =>
    optionLabels[field].join(", ");
  const hasPain = input.painScore !== null && input.painScore > 0;
  const mobilityItems: DetailItem[] = [
    { label: "Deambulación", value: labelsOf("ambulationOptionId") },
    {
      label: "Causa de la deambulación",
      value: labelsOf("ambulationCauseOptionId"),
    },
    ...(input.neurologicalLesionDetail
      ? [
          {
            label: "Detalle de la lesión neurológica",
            value: input.neurologicalLesionDetail,
          },
        ]
      : []),
    { label: "ECOG", value: labelsOf("ecogScoreOptionId") },
    { label: "Traslado al baño", value: labelsOf("bathroomTransferOptionId") },
  ];

  return (
    <div className="flex flex-col gap-6">
      <DetailList
        items={[
          {
            label: "Fecha de la evaluación",
            value: formatIsoDate(input.evaluationDate),
          },
        ]}
      />
      <DetailBlock id="esas" title="Escala de síntomas (ESAS)">
        <DetailList
          items={ESAS_SYMPTOMS.map(({ key, label }) => ({
            label,
            value: describeScore(input[key]),
          }))}
        />
      </DetailBlock>
      <DetailBlock id="vital-signs" title="Signos vitales">
        <DetailList
          items={[
            { label: "Frecuencia cardíaca", value: input.heartRate },
            { label: "Presión arterial", value: input.bloodPressure },
            { label: "Frecuencia respiratoria", value: input.respiratoryRate },
            { label: "Temperatura", value: input.temperature },
          ]}
        />
      </DetailBlock>
      <DetailBlock id="pain" title="Dolor">
        {hasPain ? (
          <DetailList
            items={PAIN_DETAIL_FIELDS.map(({ key, label }) => ({
              label,
              value: input[key],
            }))}
          />
        ) : (
          <p className="text-base text-muted-foreground">
            Sin dolor en la ESAS.
          </p>
        )}
      </DetailBlock>
      <DetailBlock id="mobility" title="Movilidad">
        <DetailList items={mobilityItems} />
      </DetailBlock>
      <DetailBlock id="personal-care" title="Cuidado personal">
        <DetailList
          items={[
            { label: "Higiene", value: labelsOf("hygieneOptionIds") },
            { label: "Boca", value: labelsOf("mouthOptionIds") },
          ]}
        />
      </DetailBlock>
      <DetailBlock id="feeding" title="Alimentación">
        <DetailList
          items={[
            { label: "Deglución", value: labelsOf("swallowingOptionId") },
            { label: "Nutrición", value: labelsOf("nutritionOptionId") },
            { label: "Hidratación", value: labelsOf("hydrationOptionId") },
            {
              label: "Forma de hidratación",
              value: labelsOf("hydrationRouteOptionId"),
            },
            { label: "Abdomen", value: labelsOf("abdomenOptionId") },
          ]}
        />
      </DetailBlock>
      <DetailBlock id="elimination" title="Eliminación">
        <DetailList
          items={[
            { label: "Diuresis", value: labelsOf("diuresisOptionId") },
            { label: "Orinas", value: labelsOf("urineOptionId") },
            {
              label: "Fecha de la última catarsis",
              value: input.lastCatarsisDate
                ? formatIsoDate(input.lastCatarsisDate)
                : "",
            },
            { label: "Catarsis", value: labelsOf("catarsisOptionIds") },
            {
              label: "Consistencia de la catarsis",
              value: labelsOf("catarsisConsistencyOptionIds"),
            },
          ]}
        />
      </DetailBlock>
      <DetailBlock id="respiratory" title="Respiratorio">
        <DetailList
          items={[
            {
              label: "Aparato respiratorio",
              value: labelsOf("respiratoryOptionId"),
            },
            { label: "Tipo de expectoración", value: input.expectorationType },
          ]}
        />
      </DetailBlock>
      <DetailBlock id="skin" title="Piel">
        <DetailList
          items={[
            {
              label: "Úlceras por presión",
              value: describeYesNo(input.hasPressureUlcers),
            },
            ...(input.hasPressureUlcers
              ? [
                  { label: "Estadio", value: input.pressureUlcerStage },
                  {
                    label: "Lugar de las úlceras",
                    value: input.pressureUlcerLocation,
                  },
                ]
              : []),
            {
              label: "Otras lesiones de piel",
              value: input.otherSkinLesions,
              isWide: true,
            },
          ]}
        />
      </DetailBlock>
      <DetailBlock id="others" title="Otros">
        <DetailList
          items={[
            { label: "Edemas", value: describeYesNo(input.hasEdemas) },
            ...(input.hasEdemas
              ? [{ label: "Lugar de los edemas", value: input.edemaLocation }]
              : []),
            { label: "Ostomías", value: describeYesNo(input.hasOstomies) },
            ...(input.hasOstomies
              ? [{ label: "Tipo de ostomía", value: input.ostomyType }]
              : []),
            {
              label: "Otros trastornos",
              value: input.otherDisorders,
              isWide: true,
            },
            { label: "Plan de cuidados", value: input.carePlan, isWide: true },
          ]}
        />
      </DetailBlock>
    </div>
  );
}
