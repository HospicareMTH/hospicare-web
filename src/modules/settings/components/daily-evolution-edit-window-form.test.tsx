import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { toast } from "sonner";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { updateDailyEvolutionEditWindowAction } from "../actions";
import { DailyEvolutionEditWindowForm } from "./daily-evolution-edit-window-form";

vi.mock("../actions", () => ({
  updateDailyEvolutionEditWindowAction: vi.fn(),
}));
vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn(), info: vi.fn() },
}));

const TWENTY_FOUR_HOURS = {
  mode: "duration",
  amount: 24,
  unit: "hours",
} as const;

function chooseMode(label: string) {
  fireEvent.click(
    within(
      screen.getByRole("radiogroup", { name: "Ventana de edición" }),
    ).getByRole("radio", { name: label }),
  );
}

describe("DailyEvolutionEditWindowForm", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("RF-CFG-02: muestra la ventana vigente y oculta la cantidad con bloqueo inmediato", () => {
    render(
      <DailyEvolutionEditWindowForm editWindow={TWENTY_FOUR_HOURS} canUpdate />,
    );

    expect(screen.getByRole("textbox", { name: "Cantidad" })).toHaveValue("24");

    chooseMode("Bloqueo inmediato");

    expect(screen.queryByRole("textbox", { name: "Cantidad" })).toBeNull();
  });

  it("RF-CFG-02: guarda la ventana y avisa", async () => {
    vi.mocked(updateDailyEvolutionEditWindowAction).mockResolvedValue({
      status: "success",
    });
    render(
      <DailyEvolutionEditWindowForm editWindow={TWENTY_FOUR_HOURS} canUpdate />,
    );

    chooseMode("Bloqueo inmediato");
    fireEvent.click(screen.getByRole("button", { name: "Guardar ventana" }));

    await waitFor(() => {
      expect(toast.success).toHaveBeenCalledWith(
        "Guardaste la ventana de edición.",
      );
    });
    expect(updateDailyEvolutionEditWindowAction).toHaveBeenCalledWith({
      mode: "immediate",
      amount: "24",
      unit: "hours",
    });
  });

  it("RF-CFG-02: muestra el error de la cantidad junto al campo", async () => {
    vi.mocked(updateDailyEvolutionEditWindowAction).mockResolvedValue({
      status: "invalid",
      fieldErrors: { amount: ["La ventana no puede superar los 30 días."] },
    });
    render(
      <DailyEvolutionEditWindowForm editWindow={TWENTY_FOUR_HOURS} canUpdate />,
    );

    fireEvent.change(screen.getByRole("textbox", { name: "Cantidad" }), {
      target: { value: "800" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Guardar ventana" }));

    expect(
      await screen.findByText("La ventana no puede superar los 30 días."),
    ).toBeInTheDocument();
    expect(screen.getByRole("textbox", { name: "Cantidad" })).toHaveAttribute(
      "aria-invalid",
      "true",
    );
  });

  it("RF-ROL-09: sin permiso de modificar muestra la ventana sin formulario", () => {
    render(
      <DailyEvolutionEditWindowForm
        editWindow={{ mode: "immediate" }}
        canUpdate={false}
      />,
    );

    expect(screen.getByText("Bloqueo inmediato")).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Guardar ventana" }),
    ).toBeNull();
  });
});
