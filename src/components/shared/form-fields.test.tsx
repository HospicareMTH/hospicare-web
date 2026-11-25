import { fireEvent, render, screen } from "@testing-library/react";
import { useState } from "react";
import { describe, expect, it } from "vitest";

import { YesNoField } from "./form-fields";

function YesNoHarness() {
  const [value, setValue] = useState(false);
  return (
    <YesNoField
      id="metastasis"
      label="Metástasis"
      value={value}
      onValueChange={setValue}
    />
  );
}

describe("YesNoField", () => {
  it("RF-ENT-02: arranca en No y marca la respuesta elegida", () => {
    render(<YesNoHarness />);
    const group = screen.getByRole("radiogroup", { name: "Metástasis" });
    const yes = screen.getByRole("radio", { name: "Sí" });
    const no = screen.getByRole("radio", { name: "No" });

    expect(group).toBeInTheDocument();
    expect(no).toHaveAttribute("aria-checked", "true");

    fireEvent.click(yes);

    expect(yes).toHaveAttribute("aria-checked", "true");
    expect(yes).toHaveAttribute("data-state", "on");
    expect(no).toHaveAttribute("aria-checked", "false");
  });

  it("RF-ENT-02: volver a tocar la respuesta elegida no la deja sin responder", () => {
    render(<YesNoHarness />);
    const no = screen.getByRole("radio", { name: "No" });

    fireEvent.click(no);

    expect(no).toHaveAttribute("aria-checked", "true");
  });
});
