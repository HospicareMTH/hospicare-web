import { fireEvent, render, screen } from "@testing-library/react";
import { useState } from "react";
import { describe, expect, it } from "vitest";

import { SectionTabPanel, SectionTabs } from "./section-tabs";

const TABS = [
  { id: "first", label: "Primera", hasErrors: false },
  { id: "second", label: "Segunda", hasErrors: true },
  { id: "third", label: "Tercera", hasErrors: false },
];

function TabsHarness() {
  const [activeTabId, setActiveTabId] = useState("first");
  return (
    <>
      <SectionTabs
        idPrefix="prueba"
        label="Secciones de prueba"
        tabs={TABS}
        activeTabId={activeTabId}
        onActiveTabChange={setActiveTabId}
      />
      {TABS.map((tab) => (
        <SectionTabPanel
          key={tab.id}
          idPrefix="prueba"
          tabId={tab.id}
          activeTabId={activeTabId}
        >
          Contenido de {tab.label}
        </SectionTabPanel>
      ))}
    </>
  );
}

describe("SectionTabs", () => {
  it("RF-UX-04: muestra una sola sección y deja las demás montadas", () => {
    render(<TabsHarness />);

    expect(screen.getByRole("tabpanel", { name: "Primera" })).toBeVisible();
    expect(screen.getByText("Contenido de Segunda")).not.toBeVisible();
    expect(screen.getByRole("tab", { name: "Primera" })).toHaveAttribute(
      "aria-selected",
      "true",
    );
  });

  it("RF-UX-04: cambia de sección con clic y con las flechas del teclado", () => {
    render(<TabsHarness />);

    fireEvent.click(screen.getByRole("tab", { name: /Tercera/ }));
    expect(screen.getByText("Contenido de Tercera")).toBeVisible();

    fireEvent.keyDown(screen.getByRole("tab", { name: /Tercera/ }), {
      key: "ArrowRight",
    });
    expect(screen.getByRole("tab", { name: "Primera" })).toHaveFocus();
    expect(screen.getByText("Contenido de Primera")).toBeVisible();

    fireEvent.keyDown(screen.getByRole("tab", { name: "Primera" }), {
      key: "End",
    });
    expect(screen.getByRole("tab", { name: /Tercera/ })).toHaveFocus();
  });

  it("RF-UX-02: anuncia qué sección tiene datos para corregir", () => {
    render(<TabsHarness />);

    expect(
      screen.getByRole("tab", { name: "Segunda, tiene datos para corregir" }),
    ).toBeInTheDocument();
  });
});
