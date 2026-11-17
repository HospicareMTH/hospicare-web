import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  dniSchema,
  optionalTextSchema,
  pastOrTodayDateSchema,
  requiredTextSchema,
} from "./field-validation";

function firstErrorMessage(result: {
  success: boolean;
  error?: { issues: { message: string }[] };
}): string | undefined {
  return result.error?.issues[0]?.message;
}

describe("dniSchema", () => {
  it("RN-10: guarda el DNI solo con dígitos aunque se cargue con puntos y guiones", () => {
    expect(dniSchema.parse("12.345.678")).toBe("12345678");
    expect(dniSchema.parse(" 1-234-567 ")).toBe("1234567");
  });

  it("RN-10: guarda sin el cero adelante un DNI de 7 dígitos escrito con 8", () => {
    expect(dniSchema.parse("01.234.567")).toBe("1234567");
  });

  it("RN-10: acepta los límites 1.000.000 y 99.999.999", () => {
    expect(dniSchema.parse("1.000.000")).toBe("1000000");
    expect(dniSchema.parse("99.999.999")).toBe("99999999");
  });

  it.each(["123456", "123.456", "123456789", "0999999", "12a45678", ""])(
    "CA-06: rechaza %j",
    (candidate) => {
      const result = dniSchema.safeParse(candidate);

      expect(result.success).toBe(false);
      expect(firstErrorMessage(result)).toBe(
        "El DNI debe tener 7 u 8 números, entre 1.000.000 y 99.999.999.",
      );
    },
  );
});

describe("pastOrTodayDateSchema", () => {
  const schema = pastOrTodayDateSchema("La fecha de nacimiento");

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-11-17T02:30:00Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("RN-02: acepta hoy en Buenos Aires aunque en UTC ya sea mañana", () => {
    expect(schema.parse("2026-11-16")).toBe("2026-11-16");
  });

  it("RN-02, CA-07: rechaza una fecha posterior a hoy en Buenos Aires", () => {
    const result = schema.safeParse("2026-11-17");

    expect(result.success).toBe(false);
    expect(firstErrorMessage(result)).toBe(
      "La fecha de nacimiento no puede ser posterior a hoy.",
    );
  });

  it.each(["2026-02-30", "16/11/2026"])(
    "rechaza una fecha inexistente o mal escrita: %j",
    (candidate) => {
      const result = schema.safeParse(candidate);

      expect(result.success).toBe(false);
      expect(firstErrorMessage(result)).toBe(
        "La fecha de nacimiento no es válida.",
      );
    },
  );

  it("pide la fecha cuando el campo está vacío", () => {
    expect(firstErrorMessage(schema.safeParse(""))).toBe(
      "Escribí la fecha de nacimiento.",
    );
  });
});

describe("requiredTextSchema", () => {
  const schema = requiredTextSchema("La dirección", {
    minLength: 3,
    maxLength: 10,
  });

  it("guarda el texto sin espacios al principio ni al final", () => {
    expect(schema.parse("  Calle 1  ")).toBe("Calle 1");
  });

  it("rechaza un texto más corto que el mínimo sin contar espacios", () => {
    const result = schema.safeParse("  ab  ");

    expect(firstErrorMessage(result)).toBe(
      "La dirección debe tener al menos 3 caracteres.",
    );
  });

  it("rechaza un texto más largo que el máximo", () => {
    const result = schema.safeParse("Calle larga 1");

    expect(firstErrorMessage(result)).toBe(
      "La dirección no puede superar los 10 caracteres.",
    );
  });
});

describe("optionalTextSchema", () => {
  const schema = optionalTextSchema("El teléfono", 5);

  it("RN-12: guarda vacío como null", () => {
    expect(schema.parse("   ")).toBeNull();
  });

  it("rechaza un texto más largo que el máximo", () => {
    const result = schema.safeParse("123456");

    expect(firstErrorMessage(result)).toBe(
      "El teléfono no puede superar los 5 caracteres.",
    );
  });
});
