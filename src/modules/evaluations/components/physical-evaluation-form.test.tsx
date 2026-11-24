import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { toast } from "sonner";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { CatalogFieldData } from "@/modules/catalogs";

import {
  createPhysicalEvaluationAction,
  updatePhysicalEvaluationAction,
} from "../actions";
import {
  buildEmptyPhysicalEvaluation,
  mapPhysicalEvaluationCatalogFields,
  type PhysicalEvaluationInput,
} from "../schemas";
import { PhysicalEvaluationForm } from "./physical-evaluation-form";

const push = vi.fn();

vi.mock("next/navigation", async (importOriginal) => ({
  ...(await importOriginal<typeof import("next/navigation")>()),
  useRouter: () => ({ push, bfcacheId: "visita-de-prueba" }),
}));
vi.mock("../actions", () => ({
  createPhysicalEvaluationAction: vi.fn(),
  updatePhysicalEvaluationAction: vi.fn(),
}));
vi.mock("@/modules/catalogs/actions", () => ({
  createCatalogOptionAction: vi.fn(),
}));
vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn(), info: vi.fn() },
}));

const GUEST_ID = "00000000-0000-4000-8000-000000000001";
const NEUROLOGICAL_LESION_ID = "00000000-0000-4000-8000-000000000002";
const RETURN_HREF = `/huespedes/${GUEST_ID}?pestana=evaluaciones`;
const TODAY = "2026-11-24";

const CATALOG_FIELDS = mapPhysicalEvaluationCatalogFields(
  (field): CatalogFieldData => ({
    catalog: "ambulation_cause",
    options:
      field === "ambulationCauseOptionId"
        ? [
            {
              id: NEUROLOGICAL_LESION_ID,
              label: "Lesión neurológica",
              isActive: true,
            },
          ]
        : [],
    canCreate: false,
  }),
);

function renderForm(
  initialEvaluation: PhysicalEvaluationInput = buildEmptyPhysicalEvaluation(
    TODAY,
  ),
) {
  render(
    <PhysicalEvaluationForm
      guestId={GUEST_ID}
      mode={{ kind: "create" }}
      initialEvaluation={initialEvaluation}
      catalogs={{
        fields: CATALOG_FIELDS,
        neurologicalLesionCauseOptionId: NEUROLOGICAL_LESION_ID,
      }}
      today={TODAY}
      returnHref={RETURN_HREF}
    />,
  );
}

function scoreGroup(symptom: string) {
  return screen.getByRole("radiogroup", { name: symptom });
}

describe("PhysicalEvaluationForm", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("RF-FIS-01: la ESAS empieza sin puntajes y el dolor pide sus datos recién con puntaje mayor que 0", () => {
    renderForm();

    expect(
      within(scoreGroup("Dolor"))
        .getAllByRole("radio")
        .filter((option) => option.getAttribute("aria-checked") === "true"),
    ).toHaveLength(0);
    expect(within(scoreGroup("Dolor")).getAllByRole("radio")).toHaveLength(11);
    expect(
      screen.getByText(
        "Se completa cuando el dolor de la ESAS es mayor que 0.",
      ),
    ).toBeInTheDocument();
    expect(screen.queryByRole("textbox", { name: "Causa" })).toBeNull();

    fireEvent.click(
      within(scoreGroup("Dolor")).getByRole("radio", { name: "6, Bastante" }),
    );

    expect(screen.getByRole("textbox", { name: "Causa" })).toBeInTheDocument();
    expect(screen.getByRole("textbox", { name: "Tipo" })).toBeInTheDocument();
  });

  it("RF-FIS-01: pide el detalle solo con la causa Lesión neurológica", () => {
    renderForm({
      ...buildEmptyPhysicalEvaluation(TODAY),
      ambulationCauseOptionId: NEUROLOGICAL_LESION_ID,
    });

    expect(
      screen.getByRole("textbox", { name: "Detalle de la lesión neurológica" }),
    ).toBeInTheDocument();
  });

  it("RF-FIS-01: con úlceras por presión pide el estadio y el lugar", () => {
    renderForm();
    expect(screen.queryByRole("radiogroup", { name: "Estadio" })).toBeNull();

    fireEvent.click(
      within(
        screen.getByRole("radiogroup", { name: "Úlceras por presión" }),
      ).getByRole("radio", { name: "Sí" }),
    );

    expect(
      within(screen.getByRole("radiogroup", { name: "Estadio" })).getAllByRole(
        "radio",
      ),
    ).toHaveLength(4);
    expect(
      screen.getByRole("textbox", { name: "Lugar de las úlceras" }),
    ).toBeInTheDocument();
  });

  it("RN-13: muestra los errores junto a cada campo y no sale de la pantalla", async () => {
    vi.mocked(createPhysicalEvaluationAction).mockResolvedValue({
      status: "invalid",
      fieldErrors: { painScore: ["Elegí un puntaje de 0 a 10."] },
    });
    renderForm();

    fireEvent.click(screen.getByRole("button", { name: "Guardar evaluación" }));

    expect(
      await screen.findByText("Elegí un puntaje de 0 a 10."),
    ).toBeInTheDocument();
    expect(scoreGroup("Dolor")).toHaveAttribute("aria-invalid", "true");
    expect(toast.error).toHaveBeenCalledWith(
      "Hay datos para corregir. Revisá los campos marcados.",
    );
    expect(push).not.toHaveBeenCalled();
  });

  it("RF-FIS-01: al guardar informa y vuelve a la pestaña Evaluaciones", async () => {
    vi.mocked(createPhysicalEvaluationAction).mockResolvedValue({
      status: "success",
    });
    renderForm();

    fireEvent.click(
      within(scoreGroup("Náuseas")).getByRole("radio", { name: "4, Poco" }),
    );
    fireEvent.click(screen.getByRole("button", { name: "Guardar evaluación" }));

    await waitFor(() => {
      expect(push).toHaveBeenCalledWith(RETURN_HREF);
    });
    expect(createPhysicalEvaluationAction).toHaveBeenCalledWith(GUEST_ID, {
      ...buildEmptyPhysicalEvaluation(TODAY),
      nauseaScore: 4,
    });
    expect(toast.success).toHaveBeenCalledWith(
      "Evaluación física de ingreso cargada.",
    );
    expect(updatePhysicalEvaluationAction).not.toHaveBeenCalled();
  });
});
