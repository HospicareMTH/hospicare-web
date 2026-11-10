import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { AppShell, TOGGLE_SIDEBAR_LABEL } from "./app-shell";

vi.mock("next/navigation", () => ({
  usePathname: () => "/",
}));

function renderShell({ isSidebarOpenByDefault = true } = {}) {
  return render(
    <AppShell
      accountMenu={null}
      isSidebarOpenByDefault={isSidebarOpenByDefault}
    >
      contenido
    </AppShell>,
  );
}

describe("AppShell", () => {
  beforeEach(() => {
    vi.stubGlobal("matchMedia", (query: string) => ({
      matches: false,
      media: query,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    }));
  });

  it("RNF-25: el botón para contraer la barra lateral se anuncia en español", () => {
    renderShell();

    expect(
      screen.getAllByRole("button", { name: TOGGLE_SIDEBAR_LABEL }).length,
    ).toBeGreaterThan(0);
  });

  it("RNF-25: marca Inicio como destino actual en la barra lateral", () => {
    renderShell();

    const homeLinks = screen.getAllByRole("link", { name: "Inicio" });
    expect(
      homeLinks.some((link) => link.getAttribute("data-active") === "true"),
    ).toBe(true);
  });

  it("RNF-25: arranca contraída cuando la persona la dejó contraída", () => {
    const { container } = renderShell({ isSidebarOpenByDefault: false });

    expect(
      container.querySelector('[data-slot="sidebar"][data-state="collapsed"]'),
    ).not.toBeNull();
  });
});
