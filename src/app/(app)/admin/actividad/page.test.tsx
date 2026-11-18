import { isValidElement } from "react";
import { describe, expect, it } from "vitest";

import ActivityLogPage from "./page";

describe("ActivityLogPage", () => {
  it("RF-UX-05: muestra la pantalla sin esperar los parámetros de la dirección", () => {
    const pendingSearchParams = new Promise<Record<string, string>>(() => {});

    const page = ActivityLogPage({
      params: Promise.resolve({}),
      searchParams: pendingSearchParams,
    });

    expect(page).not.toBeInstanceOf(Promise);
    expect(isValidElement(page)).toBe(true);
  });
});
