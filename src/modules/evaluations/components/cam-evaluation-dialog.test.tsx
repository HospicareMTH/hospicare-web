import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { toast } from "sonner";
import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  createCamEvaluationAction,
  updateCamEvaluationAction,
} from "../actions";
import { buildEmptyCamEvaluation, type CamEvaluationInput } from "../schemas";
import {
  CamEvaluationDialog,
  type CamEvaluationDialogMode,
} from "./cam-evaluation-dialog";

vi.mock("../actions", () => ({
  createCamEvaluationAction: vi.fn(),
  updateCamEvaluationAction: vi.fn(),
}));
vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn(), info: vi.fn() },
}));

const GUEST_ID = "00000000-0000-4000-8000-000000000001";
const TODAY = "2026-11-24";

function renderDialog(
  mode: CamEvaluationDialogMode = { kind: "create" },
  initialEvaluation: CamEvaluationInput = buildEmptyCamEvaluation(TODAY),
) {
  const onClose = vi.fn();
  render(
    <CamEvaluationDialog
      guestId={GUEST_ID}
      guestFullName="Rosa Ficticia"
      mode={mode}
      initialEvaluation={initialEvaluation}
      today={TODAY}
      onClose={onClose}
    />,
  );
  return { onClose };
}

function answer(criterion: string, option: "Sí" | "No") {
  fireEvent.click(
    within(screen.getByRole("radiogroup", { name: criterion })).getByRole(
      "radio",
      {
        name: option,
      },
    ),
  );
}

function queryCriterion(criterion: string) {
  return screen.queryByRole("radiogroup", { name: criterion });
}

describe("CamEvaluationDialog", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("RF-CAM-01, RF-CAM-02: empieza sin respuestas, con la fecha de hoy y solo el primer criterio", () => {
    renderDialog();

    expect(
      screen.getByRole("dialog", {
        name: "Cargar la evaluación CAM de Rosa Ficticia",
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("textbox", { name: "Fecha de la evaluación" }),
    ).toHaveValue("24/11/2026");
    expect(
      within(screen.getByRole("radiogroup", { name: "Comienzo agudo" }))
        .getAllByRole("radio")
        .map((option) => option.getAttribute("aria-checked")),
    ).toEqual(["false", "false"]);
    expect(queryCriterion("Inatención")).not.toBeInTheDocument();
    expect(
      screen.getByText("El resultado aparece cuando respondas los criterios."),
    ).toBeInTheDocument();
  });

  it("RF-CAM-02, RF-CAM-03: muestra los criterios en orden y calcula el resultado al responderlos", () => {
    renderDialog();

    answer("Comienzo agudo", "Sí");
    expect(queryCriterion("Inatención")).toBeInTheDocument();
    expect(queryCriterion("Pensamiento desorganizado")).not.toBeInTheDocument();

    answer("Inatención", "Sí");
    answer("Pensamiento desorganizado", "No");
    answer("Conciencia alterada", "Sí");
    expect(screen.getByText(/^Resultado:/)).toHaveTextContent(
      "Resultado: Delirium probable",
    );

    answer("Inatención", "No");
    expect(queryCriterion("Conciencia alterada")).not.toBeInTheDocument();
    expect(screen.getByText(/^Resultado:/)).toHaveTextContent(
      "Resultado: Sin delirium probable",
    );
  });

  it("RN-13: muestra el error junto al criterio y no cierra", async () => {
    vi.mocked(createCamEvaluationAction).mockResolvedValue({
      status: "invalid",
      fieldErrors: { acuteOnset: ["Elegí Sí o No."] },
    });
    const { onClose } = renderDialog();

    fireEvent.click(screen.getByRole("button", { name: "Guardar evaluación" }));

    expect(await screen.findByText("Elegí Sí o No.")).toBeInTheDocument();
    expect(
      screen.getByRole("radiogroup", { name: "Comienzo agudo" }),
    ).toHaveAttribute("aria-invalid", "true");
    expect(onClose).not.toHaveBeenCalled();
  });

  it("RF-CAM-01: al cargarla envía las respuestas, informa el resultado y cierra", async () => {
    vi.mocked(createCamEvaluationAction).mockResolvedValue({
      status: "success",
    });
    const { onClose } = renderDialog();

    answer("Comienzo agudo", "No");
    fireEvent.click(screen.getByRole("button", { name: "Guardar evaluación" }));

    await waitFor(() => {
      expect(createCamEvaluationAction).toHaveBeenCalledWith(GUEST_ID, {
        ...buildEmptyCamEvaluation(TODAY),
        acuteOnset: false,
      });
    });
    await waitFor(() => {
      expect(toast.success).toHaveBeenCalledWith("Evaluación CAM cargada.");
    });
    expect(onClose).toHaveBeenCalled();
  });

  it("RF-CAM-04: al modificarla parte de lo guardado y envía la versión", async () => {
    vi.mocked(updateCamEvaluationAction).mockResolvedValue({
      status: "success",
    });
    const saved: CamEvaluationInput = {
      evaluationDate: "2026-11-20",
      acuteOnset: false,
      inattention: null,
      disorganizedThinking: null,
      alteredConsciousness: null,
      observations: "Tranquilo",
    };
    renderDialog(
      { kind: "update", version: "2026-11-20T12:00:00.000Z" },
      saved,
    );

    expect(screen.getByRole("textbox", { name: "Observaciones" })).toHaveValue(
      "Tranquilo",
    );
    fireEvent.click(screen.getByRole("button", { name: "Guardar cambios" }));

    await waitFor(() => {
      expect(updateCamEvaluationAction).toHaveBeenCalledWith(
        GUEST_ID,
        "2026-11-20T12:00:00.000Z",
        saved,
      );
    });
    await waitFor(() => {
      expect(toast.success).toHaveBeenCalledWith("Guardaste los cambios.");
    });
  });
});
