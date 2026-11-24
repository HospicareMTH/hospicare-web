import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { toast } from "sonner";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { registerDailyEvolutionAction } from "../actions";
import { DailyEvolutionComposer } from "./daily-evolution-composer";

vi.mock("../actions", () => ({ registerDailyEvolutionAction: vi.fn() }));
vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn(), info: vi.fn() },
}));

const GUEST_ID = "00000000-0000-4000-8000-000000000001";
const EVOLUTION_TEXT = "Pasó la noche tranquila, sin dolor.";

function writeAndRegister(text: string) {
  fireEvent.change(screen.getByRole("textbox", { name: "Nueva evolución" }), {
    target: { value: text },
  });
  fireEvent.click(screen.getByRole("button", { name: "Registrar evolución" }));
}

describe("DailyEvolutionComposer", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("RF-EVO-03: muestra la firma antes de guardar", () => {
    render(
      <DailyEvolutionComposer guestId={GUEST_ID} signature="Enfermería" />,
    );

    expect(screen.getByText(/^Se firma como/)).toHaveTextContent(
      "Se firma como Enfermería.",
    );
  });

  it("RF-EVO-07: si el texto es rechazado, conserva lo escrito y avisa junto al campo", async () => {
    vi.mocked(registerDailyEvolutionAction).mockResolvedValue({
      status: "invalid",
      fieldErrors: {
        text: ["La evolución debe tener al menos 10 caracteres."],
      },
    });
    render(
      <DailyEvolutionComposer guestId={GUEST_ID} signature="Enfermería" />,
    );

    writeAndRegister("Corta");

    expect(
      await screen.findByText(
        "La evolución debe tener al menos 10 caracteres.",
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("textbox", { name: "Nueva evolución" }),
    ).toHaveValue("Corta");
  });

  it("RF-EVO-02: al registrar informa y deja el campo vacío", async () => {
    vi.mocked(registerDailyEvolutionAction).mockResolvedValue({
      status: "success",
    });
    render(
      <DailyEvolutionComposer guestId={GUEST_ID} signature="Enfermería" />,
    );

    writeAndRegister(EVOLUTION_TEXT);

    await waitFor(() => {
      expect(toast.success).toHaveBeenCalledWith("Evolución registrada.");
    });
    expect(registerDailyEvolutionAction).toHaveBeenCalledWith(GUEST_ID, {
      text: EVOLUTION_TEXT,
    });
    expect(
      screen.getByRole("textbox", { name: "Nueva evolución" }),
    ).toHaveValue("");
  });
});
