import { describe, expect, it } from "vitest";

import { formatDate } from "./dates";

describe("formatDate", () => {
  it("RN-01, RN-03: muestra DD/MM/AAAA en hora de Buenos Aires", () => {
    expect(formatDate(new Date("2026-03-05T02:30:00Z"))).toBe("04/03/2026");
    expect(formatDate(new Date("2026-03-05T03:00:00Z"))).toBe("05/03/2026");
  });
});
