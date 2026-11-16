import { fireEvent, render, screen } from "@testing-library/react";
import { useState } from "react";
import { describe, expect, it } from "vitest";

import { DateField } from "./date-field";

function DateFieldHarness({ initialValue }: { initialValue: string }) {
  const [value, setValue] = useState(initialValue);
  return (
    <>
      <label htmlFor="fecha">Fecha</label>
      <DateField
        id="fecha"
        value={value}
        onValueChange={setValue}
        latestIsoDate="2026-11-16"
      />
      <output>{value}</output>
    </>
  );
}

describe("DateField", () => {
  it("RN-03: muestra la fecha guardada como DD/MM/AAAA", () => {
    render(<DateFieldHarness initialValue="2026-03-05" />);

    expect(screen.getByLabelText("Fecha")).toHaveValue("05/03/2026");
  });

  it("RN-03: convierte lo que se escribe a AAAA-MM-DD", () => {
    render(<DateFieldHarness initialValue="" />);

    fireEvent.change(screen.getByLabelText("Fecha"), {
      target: { value: "5/3/2026" },
    });

    expect(screen.getByRole("status")).toHaveTextContent("2026-03-05");
  });

  it("deja el texto tal cual si no es una fecha, para que el servidor lo rechace", () => {
    render(<DateFieldHarness initialValue="" />);

    fireEvent.change(screen.getByLabelText("Fecha"), {
      target: { value: "31/02/2026" },
    });

    expect(screen.getByRole("status")).toHaveTextContent("31/02/2026");
  });

  it("ofrece el calendario con un nombre propio", () => {
    render(<DateFieldHarness initialValue="" />);

    expect(
      screen.getByRole("button", { name: "Elegir en el calendario" }),
    ).toBeInTheDocument();
  });
});
