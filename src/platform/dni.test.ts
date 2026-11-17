import { describe, expect, it } from "vitest";

import { formatDni, removeDniSeparators } from "./dni";

describe("removeDniSeparators", () => {
  it("RN-10: quita puntos, guiones y espacios", () => {
    expect(removeDniSeparators(" 12.345-678 ")).toBe("12345678");
  });
});

describe("formatDni", () => {
  it("muestra el DNI con puntos de miles", () => {
    expect(formatDni("12345678")).toBe("12.345.678");
    expect(formatDni("1234567")).toBe("1.234.567");
  });
});
