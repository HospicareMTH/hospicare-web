import { describe, expect, it } from "vitest";

import { getUserInitials } from "./user-initials";

describe("getUserInitials", () => {
  it("RF-ACC-15: toma la inicial de las dos primeras palabras del nombre", () => {
    expect(getUserInitials("ana maría prueba")).toBe("AM");
  });

  it("RF-ACC-15: tolera espacios de más y nombres de una palabra", () => {
    expect(getUserInitials("  Ana  ")).toBe("A");
  });
});
