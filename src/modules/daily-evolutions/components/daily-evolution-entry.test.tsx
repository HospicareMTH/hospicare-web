import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { toast } from "sonner";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { addClarificationAction, updateDailyEvolutionAction } from "../actions";
import {
  DailyEvolutionEntry,
  type DailyEvolutionEntryData,
} from "./daily-evolution-entry";

vi.mock("../actions", () => ({
  addClarificationAction: vi.fn(),
  annulDailyEvolutionAction: vi.fn(),
  updateDailyEvolutionAction: vi.fn(),
}));
vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn(), info: vi.fn() },
}));

const EVOLUTION: DailyEvolutionEntryData = {
  id: "00000000-0000-4000-8000-000000000001",
  version: "2026-11-24T15:00:00.000Z",
  text: "Pasó la noche tranquila, sin dolor.",
  timeLabel: "24/11/2026 12:00",
  timeIso: "2026-11-24T15:00:00.000Z",
  authorLabel: "Ana Prueba",
  signature: "Enfermería",
  isLocked: false,
  editableUntilLabel: "25/11/2026 12:00",
  modifiedAtLabel: null,
  clarifications: [],
  canEdit: true,
  canAnnul: true,
  clarificationSignature: "Enfermería",
};

function renderEntry(overrides: Partial<DailyEvolutionEntryData> = {}) {
  render(
    <ol>
      <DailyEvolutionEntry evolution={{ ...EVOLUTION, ...overrides }} />
    </ol>,
  );
}

describe("DailyEvolutionEntry", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("RF-EVO-04: al autor dentro de la ventana le muestra hasta cuándo puede corregirla", () => {
    renderEntry();

    expect(
      screen.getByText("Podés corregirla hasta el 25/11/2026 12:00."),
    ).toBeInTheDocument();
    expect(screen.queryByText("Bloqueada")).toBeNull();
    expect(screen.getByRole("button", { name: "Editar" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Anular" })).toBeInTheDocument();
  });

  it("CA-10, 8.2: bloqueada, solo ofrece agregar una nota aclaratoria", () => {
    renderEntry({
      isLocked: true,
      editableUntilLabel: null,
      canEdit: false,
      canAnnul: false,
      modifiedAtLabel: "24/11/2026 12:30",
    });

    expect(screen.getByText("Bloqueada")).toBeInTheDocument();
    expect(
      screen.getByText("Modificada el 24/11/2026 12:30."),
    ).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Editar" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Anular" })).toBeNull();
    expect(
      screen.getByRole("button", { name: "Agregar nota aclaratoria" }),
    ).toBeInTheDocument();
  });

  it("RF-EVO-04: edita en el lugar y envía la versión", async () => {
    vi.mocked(updateDailyEvolutionAction).mockResolvedValue({
      status: "success",
    });
    renderEntry();

    fireEvent.click(screen.getByRole("button", { name: "Editar" }));
    const field = screen.getByRole("textbox", { name: "Evolución" });
    expect(field).toHaveValue(EVOLUTION.text);
    fireEvent.change(field, {
      target: { value: "Pasó la noche tranquila, con dolor leve." },
    });
    fireEvent.click(screen.getByRole("button", { name: "Guardar cambios" }));

    await waitFor(() => {
      expect(toast.success).toHaveBeenCalledWith("Guardaste los cambios.");
    });
    expect(updateDailyEvolutionAction).toHaveBeenCalledWith(
      EVOLUTION.id,
      EVOLUTION.version,
      { text: "Pasó la noche tranquila, con dolor leve." },
    );
  });

  it("RF-EVO-05: la nota muestra la firma antes de guardar y se lista con su autor", async () => {
    vi.mocked(addClarificationAction).mockResolvedValue({ status: "success" });
    renderEntry({
      clarifications: [
        {
          id: "00000000-0000-4000-8000-000000000002",
          text: "Se avisó a la familia.",
          timeLabel: "24/11/2026 13:00",
          timeIso: "2026-11-24T16:00:00.000Z",
          authorLabel: "Bruno Prueba",
          signature: "Psicología",
        },
      ],
    });

    expect(
      screen.getByText(/^Nota aclaratoria/).closest("p"),
    ).toHaveTextContent(
      "Nota aclaratoria · 24/11/2026 13:00 · Bruno Prueba · Psicología",
    );

    fireEvent.click(
      screen.getByRole("button", { name: "Agregar nota aclaratoria" }),
    );
    expect(screen.getByText(/^Se firma como/)).toHaveTextContent(
      "Se firma como Enfermería.",
    );
    fireEvent.change(
      screen.getByRole("textbox", { name: "Nota aclaratoria" }),
      {
        target: { value: "El dolor cedió con el rescate." },
      },
    );
    fireEvent.click(screen.getByRole("button", { name: "Guardar nota" }));

    await waitFor(() => {
      expect(toast.success).toHaveBeenCalledWith("Nota aclaratoria agregada.");
    });
  });

  it("RF-EVO-06: anular abre el diálogo con la fecha de la evolución", () => {
    renderEntry();

    fireEvent.click(screen.getByRole("button", { name: "Anular" }));

    expect(
      screen.getByRole("dialog", {
        name: "Anular la evolución del 24/11/2026 12:00",
      }),
    ).toHaveTextContent("Sale del historial");
  });
});
