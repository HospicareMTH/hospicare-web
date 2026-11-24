// @vitest-environment node

import { describe, expect, it } from "vitest";

import {
  buildEmptyPhysicalEvaluation,
  ESAS_SCORE_MESSAGE,
  ESAS_SYMPTOMS,
  type PhysicalEvaluationInput,
  physicalEvaluationSchema,
} from "./schemas";

const ALL_SCORES_ZERO = Object.fromEntries(
  ESAS_SYMPTOMS.map(({ key }) => [key, 0]),
);

function buildInput(
  overrides: Partial<PhysicalEvaluationInput> = {},
): PhysicalEvaluationInput {
  return {
    ...buildEmptyPhysicalEvaluation("2026-11-20"),
    ...ALL_SCORES_ZERO,
    ...overrides,
  };
}

function fieldErrorsOf(input: PhysicalEvaluationInput) {
  return physicalEvaluationSchema.safeParse(input).error?.flatten().fieldErrors;
}

describe("evaluación física de ingreso: validación", () => {
  it("RF-FIS-01: exige los 10 puntajes de la ESAS, sin valor inicial", () => {
    const errors = fieldErrorsOf(buildEmptyPhysicalEvaluation("2026-11-20"));

    expect(Object.keys(errors ?? {}).sort()).toEqual(
      ESAS_SYMPTOMS.map(({ key }) => key).sort(),
    );
    expect(errors?.painScore).toEqual([ESAS_SCORE_MESSAGE]);
  });

  it("RF-FIS-01: rechaza un puntaje fuera de 0 a 10", () => {
    expect(fieldErrorsOf(buildInput({ nauseaScore: 11 }))).toEqual({
      nauseaScore: [ESAS_SCORE_MESSAGE],
    });
  });

  it("RN-13: con dolor mayor que 0 exige causa, localización, intensidad y tipo", () => {
    expect(
      fieldErrorsOf(buildInput({ painScore: 3, painType: "Punzante" })),
    ).toEqual({
      painCause: ["Escribí la causa del dolor."],
      painLocation: ["Escribí la localización del dolor."],
      painIntensity: ["Escribí la intensidad del dolor."],
    });
  });

  it("RN-12: sin dolor guarda vacíos los datos del dolor", () => {
    expect(
      physicalEvaluationSchema.parse(
        buildInput({ painScore: 0, painCause: "Tumoral" }),
      ),
    ).toMatchObject({ painCause: null });
  });

  it("RN-13: con úlceras, edemas u ostomías exige sus datos", () => {
    expect(
      fieldErrorsOf(
        buildInput({
          hasPressureUlcers: true,
          hasEdemas: true,
          hasOstomies: true,
        }),
      ),
    ).toEqual({
      pressureUlcerStage: ["Elegí el estadio de las úlceras."],
      pressureUlcerLocation: ["Escribí el lugar de las úlceras."],
      edemaLocation: ["Escribí el lugar de los edemas."],
      ostomyType: ["Escribí el tipo de ostomía."],
    });
  });

  it("RN-12: al desmarcar úlceras, edemas u ostomías guarda vacíos sus datos", () => {
    expect(
      physicalEvaluationSchema.parse(
        buildInput({
          hasPressureUlcers: false,
          pressureUlcerStage: "II",
          pressureUlcerLocation: "Sacro",
          hasEdemas: false,
          edemaLocation: "Tobillos",
          hasOstomies: false,
          ostomyType: "Colostomía",
        }),
      ),
    ).toMatchObject({
      pressureUlcerStage: null,
      pressureUlcerLocation: null,
      edemaLocation: null,
      ostomyType: null,
    });
  });

  it("RN-02: la fecha de la última catarsis es opcional y no puede ser futura", () => {
    expect(
      physicalEvaluationSchema.parse(buildInput({ lastCatarsisDate: "" })),
    ).toMatchObject({ lastCatarsisDate: null });
    expect(
      fieldErrorsOf(buildInput({ lastCatarsisDate: "2999-01-01" })),
    ).toEqual({
      lastCatarsisDate: [
        "La fecha de la última catarsis no puede ser posterior a hoy.",
      ],
    });
  });

  it("RF-FIS-01: limita signos vitales a 40 caracteres y textos largos a 2000", () => {
    expect(
      fieldErrorsOf(
        buildInput({ heartRate: "1".repeat(41), carePlan: "a".repeat(2001) }),
      ),
    ).toEqual({
      heartRate: ["La frecuencia cardíaca no puede superar los 40 caracteres."],
      carePlan: ["El plan de cuidados no puede superar los 2000 caracteres."],
    });
  });
});
