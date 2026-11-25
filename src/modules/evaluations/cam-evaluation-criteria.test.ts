// @vitest-environment node

import { describe, expect, it } from "vitest";

import {
  assessCamCriteria,
  type CamCriteria,
  type CamEvaluationInput,
  camEvaluationSchema,
  CRITERION_REQUIRED_MESSAGE,
  listReachedCamCriteria,
} from "./schemas";

const UNANSWERED: CamCriteria = {
  acuteOnset: null,
  inattention: null,
  disorganizedThinking: null,
  alteredConsciousness: null,
};

function buildInput(
  overrides: Partial<CamEvaluationInput> = {},
): CamEvaluationInput {
  return {
    evaluationDate: "2026-11-20",
    ...UNANSWERED,
    observations: "",
    ...overrides,
  };
}

describe("evaluación CAM: criterios y resultado", () => {
  it("RF-CAM-02: muestra un criterio por vez hasta que comienzo agudo e inatención son Sí", () => {
    expect(listReachedCamCriteria(UNANSWERED)).toEqual(["acuteOnset"]);
    expect(
      listReachedCamCriteria({ ...UNANSWERED, acuteOnset: false }),
    ).toEqual(["acuteOnset"]);
    expect(listReachedCamCriteria({ ...UNANSWERED, acuteOnset: true })).toEqual(
      ["acuteOnset", "inattention"],
    );
    expect(
      listReachedCamCriteria({
        ...UNANSWERED,
        acuteOnset: true,
        inattention: true,
      }),
    ).toEqual([
      "acuteOnset",
      "inattention",
      "disorganizedThinking",
      "alteredConsciousness",
    ]);
  });

  it("CA-11, RF-CAM-02: sin comienzo agudo se detiene ahí y descarta lo demás (RN-12)", () => {
    expect(
      assessCamCriteria({
        acuteOnset: false,
        inattention: true,
        disorganizedThinking: true,
        alteredConsciousness: true,
      }),
    ).toEqual({
      acuteOnset: false,
      inattention: null,
      disorganizedThinking: null,
      alteredConsciousness: null,
      isDeliriumLikely: false,
      stoppedAtCriterion: "acute_onset",
    });
  });

  it("RF-CAM-02: sin inatención se detiene ahí y descarta los últimos criterios (RN-12)", () => {
    expect(
      assessCamCriteria({
        acuteOnset: true,
        inattention: false,
        disorganizedThinking: true,
        alteredConsciousness: false,
      }),
    ).toEqual({
      acuteOnset: true,
      inattention: false,
      disorganizedThinking: null,
      alteredConsciousness: null,
      isDeliriumLikely: false,
      stoppedAtCriterion: "inattention",
    });
  });

  it.each([
    { disorganizedThinking: true, alteredConsciousness: true, expected: true },
    { disorganizedThinking: true, alteredConsciousness: false, expected: true },
    { disorganizedThinking: false, alteredConsciousness: true, expected: true },
    {
      disorganizedThinking: false,
      alteredConsciousness: false,
      expected: false,
    },
  ])(
    "RF-CAM-03: con comienzo agudo e inatención, pensamiento $disorganizedThinking y conciencia $alteredConsciousness dan delirium probable $expected",
    ({ disorganizedThinking, alteredConsciousness, expected }) => {
      expect(
        assessCamCriteria({
          acuteOnset: true,
          inattention: true,
          disorganizedThinking,
          alteredConsciousness,
        }),
      ).toMatchObject({ isDeliriumLikely: expected, stoppedAtCriterion: null });
    },
  );

  it("RF-CAM-03: no calcula el resultado mientras falte un criterio alcanzado", () => {
    expect(assessCamCriteria(UNANSWERED)).toBeNull();
    expect(
      assessCamCriteria({
        ...UNANSWERED,
        acuteOnset: true,
        inattention: true,
        disorganizedThinking: false,
      }),
    ).toBeNull();
  });

  it("RN-13: exige responder cada criterio alcanzado, junto al campo", () => {
    const result = camEvaluationSchema.safeParse(
      buildInput({ acuteOnset: true, inattention: true }),
    );

    expect(result.success).toBe(false);
    expect(result.error?.flatten().fieldErrors).toEqual({
      disorganizedThinking: [CRITERION_REQUIRED_MESSAGE],
      alteredConsciousness: [CRITERION_REQUIRED_MESSAGE],
    });
  });

  it("RF-CAM-01, RN-02: rechaza una fecha futura y observaciones de más de 100 caracteres", () => {
    const result = camEvaluationSchema.safeParse(
      buildInput({
        evaluationDate: "2999-01-01",
        acuteOnset: false,
        observations: "a".repeat(101),
      }),
    );

    expect(result.error?.flatten().fieldErrors).toEqual({
      evaluationDate: [
        "La fecha de la evaluación no puede ser posterior a hoy.",
      ],
      observations: [
        "El texto de las observaciones no puede superar los 100 caracteres.",
      ],
    });
  });

  it("RF-CAM-01: guarda las observaciones vacías como sin cargar", () => {
    expect(
      camEvaluationSchema.parse(
        buildInput({ acuteOnset: false, observations: "   " }),
      ),
    ).toMatchObject({ observations: null });
  });
});
