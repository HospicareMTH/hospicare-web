import { describe, expect, it } from "vitest";

import {
  formatDate,
  formatDateTime,
  formatIsoDate,
  getBusinessDate,
  isAfterBusinessToday,
} from "./dates";

describe("getBusinessDate", () => {
  it("RN-01: devuelve AAAA-MM-DD del día en Buenos Aires", () => {
    expect(getBusinessDate(new Date("2026-03-05T02:59:00Z"))).toBe(
      "2026-03-04",
    );
    expect(getBusinessDate(new Date("2026-03-05T03:00:00Z"))).toBe(
      "2026-03-05",
    );
  });
});

describe("isAfterBusinessToday", () => {
  const lateNightInBuenosAires = new Date("2026-11-17T02:30:00Z");

  it("RN-02: hoy en Buenos Aires no es futuro aunque en UTC ya sea mañana", () => {
    expect(isAfterBusinessToday("2026-11-16", lateNightInBuenosAires)).toBe(
      false,
    );
  });

  it("RN-02: mañana en Buenos Aires es futuro", () => {
    expect(isAfterBusinessToday("2026-11-17", lateNightInBuenosAires)).toBe(
      true,
    );
  });
});

describe("formatDate", () => {
  it("RN-01, RN-03: muestra DD/MM/AAAA en hora de Buenos Aires", () => {
    expect(formatDate(new Date("2026-03-05T02:30:00Z"))).toBe("04/03/2026");
    expect(formatDate(new Date("2026-03-05T03:00:00Z"))).toBe("05/03/2026");
  });
});

describe("formatIsoDate", () => {
  it("RN-03: muestra una fecha de calendario como DD/MM/AAAA sin correrla de día", () => {
    expect(formatIsoDate("2026-03-05")).toBe("05/03/2026");
  });
});

describe("formatDateTime", () => {
  it("RN-01: muestra DD/MM/AAAA HH:mm en hora de Buenos Aires", () => {
    expect(formatDateTime(new Date("2026-11-10T23:05:00Z"))).toBe(
      "10/11/2026 20:05",
    );
    expect(formatDateTime(new Date("2026-11-11T03:00:00Z"))).toBe(
      "11/11/2026 00:00",
    );
  });
});
