import { describe, expect, it } from "vitest";

import { formatDate, formatDateTime } from "./dates";

describe("formatDate", () => {
  it("RN-01, RN-03: muestra DD/MM/AAAA en hora de Buenos Aires", () => {
    expect(formatDate(new Date("2026-03-05T02:30:00Z"))).toBe("04/03/2026");
    expect(formatDate(new Date("2026-03-05T03:00:00Z"))).toBe("05/03/2026");
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
