import { isValidElement } from "react";
import { describe, expect, it } from "vitest";

import NewAdmissionInterviewPage from "./page";

describe("NewAdmissionInterviewPage", () => {
  it("RF-UX-05: muestra la pantalla mientras carga el formulario", () => {
    const page = NewAdmissionInterviewPage();

    expect(page).not.toBeInstanceOf(Promise);
    expect(isValidElement(page)).toBe(true);
  });
});
