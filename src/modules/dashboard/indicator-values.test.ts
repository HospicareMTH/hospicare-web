import { describe, expect, it } from "vitest";

import {
  describeCountWithShare,
  describeEvaluatedShare,
  describeRate,
} from "./indicator-values";

const NON_BREAKING_SPACE = " ";

describe("inicio: valores de los indicadores", () => {
  it("7.2: la conversión muestra el porcentaje redondeado y la proporción", () => {
    expect(describeRate(4, 10, "Sin entrevistas")).toBe(
      `40${NON_BREAKING_SPACE}% (4 de 10)`,
    );
    expect(describeRate(2, 3, "Sin entrevistas")).toBe(
      `67${NON_BREAKING_SPACE}% (2 de 3)`,
    );
  });

  it("7.2: la cobertura muestra la cantidad y el porcentaje", () => {
    expect(describeCountWithShare(10, 12, "Sin huéspedes")).toBe(
      `10 de 12 (83${NON_BREAKING_SPACE}%)`,
    );
  });

  it("7.2: los hallazgos se cuentan sobre los evaluados", () => {
    expect(describeEvaluatedShare(2, 8)).toBe("2 de 8 evaluados");
  });

  it("7.2: sin base para calcular, muestra el texto de vacío", () => {
    expect(describeRate(0, 0, "Sin entrevistas")).toBe("Sin entrevistas");
    expect(describeCountWithShare(0, 0, "Sin huéspedes")).toBe("Sin huéspedes");
    expect(describeEvaluatedShare(0, 0)).toBe("Sin evaluaciones");
  });
});
