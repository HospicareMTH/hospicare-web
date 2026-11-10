import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { ThemeProvider } from "./theme-provider";
import { ThemeToggle } from "./theme-toggle";

function stubSystemColorScheme(isDark: boolean) {
  vi.stubGlobal("matchMedia", (query: string) => ({
    matches: isDark,
    media: query,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    addListener: vi.fn(),
    removeListener: vi.fn(),
  }));
}

function renderToggle() {
  render(
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      <ThemeToggle />
    </ThemeProvider>,
  );
  return screen.getByRole("button", {
    name: "Cambiar entre modo claro y oscuro",
  });
}

describe("ThemeToggle", () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.className = "";
  });

  it("RF-UX-06: de claro pasa a oscuro", () => {
    stubSystemColorScheme(false);

    fireEvent.click(renderToggle());

    expect(document.documentElement).toHaveClass("dark");
  });

  it("RF-UX-06: de oscuro pasa a claro", () => {
    stubSystemColorScheme(true);

    fireEvent.click(renderToggle());

    expect(document.documentElement).toHaveClass("light");
  });
});
