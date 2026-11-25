import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { createAdmissionInterviewAction } from "../actions";
import { buildEmptyInterview } from "../schemas";
import type { CatalogFieldData } from "@/modules/catalogs";

import type { InterviewCatalogFields } from "../service";
import { AdmissionInterviewForm } from "./admission-interview-form";

const push = vi.fn();

vi.mock("next/navigation", async (importOriginal) => ({
  ...(await importOriginal<typeof import("next/navigation")>()),
  useRouter: () => ({ push, bfcacheId: "visita-de-prueba" }),
}));
vi.mock("../actions", () => ({
  createAdmissionInterviewAction: vi.fn(),
  updateAdmissionInterviewAction: vi.fn(),
  checkDniInActiveInterviewAction: vi.fn(),
}));
vi.mock("@/modules/catalogs/actions", () => ({
  createCatalogOptionAction: vi.fn(),
}));
vi.mock("@/modules/catalogs/professionals/actions", () => ({
  createHealthcareProfessionalAction: vi.fn(),
}));

const EMPTY_CATALOG_FIELD: CatalogFieldData = {
  catalog: "religion",
  options: [],
  canCreate: false,
};

const CATALOG_FIELDS: InterviewCatalogFields = {
  healthInsurance: EMPTY_CATALOG_FIELD,
  informationAwareness: EMPTY_CATALOG_FIELD,
  religion: EMPTY_CATALOG_FIELD,
  ecogScore: EMPTY_CATALOG_FIELD,
  relationship: EMPTY_CATALOG_FIELD,
  primaryDoctor: EMPTY_CATALOG_FIELD,
  metastasisLocation: EMPTY_CATALOG_FIELD,
  oncologicalTreatment: EMPTY_CATALOG_FIELD,
  surgery: EMPTY_CATALOG_FIELD,
};

function renderNewInterviewForm() {
  render(
    <AdmissionInterviewForm
      mode={{ kind: "create" }}
      initialInterview={buildEmptyInterview("2026-11-16")}
      catalogFields={CATALOG_FIELDS}
      religionOtherOptionId={null}
      today="2026-11-16"
    />,
  );
}

async function typeNameAndSave() {
  fireEvent.change(screen.getByRole("textbox", { name: /^Nombre/ }), {
    target: { value: "Conservada" },
  });
  fireEvent.click(screen.getByRole("button", { name: "Guardar entrevista" }));
  await waitFor(() =>
    expect(createAdmissionInterviewAction).toHaveBeenCalled(),
  );
}

describe("AdmissionInterviewForm", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  it("RF-ENT-02: si el servidor rechaza el guardado, lo cargado sigue en el formulario", async () => {
    vi.mocked(createAdmissionInterviewAction).mockResolvedValue({
      status: "rejected",
      message: "Motivo ficticio del rechazo.",
    });
    renderNewInterviewForm();

    await typeNameAndSave();

    expect(screen.getByRole("textbox", { name: /^Nombre/ })).toHaveValue(
      "Conservada",
    );
    expect(push).not.toHaveBeenCalled();
  });

  it("RF-ENT-02: si la conexión falla al guardar, lo cargado sigue en el formulario", async () => {
    vi.mocked(createAdmissionInterviewAction).mockRejectedValue(
      new Error("Falla de red ficticia"),
    );
    renderNewInterviewForm();

    await typeNameAndSave();

    await waitFor(() =>
      expect(
        screen.getByRole("button", { name: "Guardar entrevista" }),
      ).toBeEnabled(),
    );
    expect(screen.getByRole("textbox", { name: /^Nombre/ })).toHaveValue(
      "Conservada",
    );
    expect(push).not.toHaveBeenCalled();
  });
});
