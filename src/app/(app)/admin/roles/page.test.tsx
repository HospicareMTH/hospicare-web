import { isValidElement } from "react";
import { describe, expect, it } from "vitest";

import RolesPage from "./page";

describe("RolesPage", () => {
  it("RF-UX-05: muestra la pantalla sin esperar los parámetros de la dirección", () => {
    const pendingSearchParams = new Promise<Record<string, string>>(() => {});

    const page = RolesPage({
      params: Promise.resolve({}),
      searchParams: pendingSearchParams,
    });

    expect(page).not.toBeInstanceOf(Promise);
    expect(isValidElement(page)).toBe(true);
  });
});
