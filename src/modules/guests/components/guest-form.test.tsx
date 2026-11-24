import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { CatalogFieldData } from "@/modules/catalogs";

import {
  checkGuestDniAction,
  createGuestManuallyAction,
  updateGuestAction,
} from "../actions";
import { buildEmptyGuest } from "../schemas";
import { GuestForm } from "./guest-form";

const push = vi.fn();

vi.mock("next/navigation", async (importOriginal) => ({
  ...(await importOriginal<typeof import("next/navigation")>()),
  useRouter: () => ({ push, bfcacheId: "visita-de-prueba" }),
}));
vi.mock("../actions", () => ({
  createGuestManuallyAction: vi.fn(),
  checkGuestDniAction: vi.fn(),
  updateGuestAction: vi.fn(),
}));
vi.mock("@/modules/catalogs/actions", () => ({
  createCatalogOptionAction: vi.fn(),
}));
vi.mock("@/modules/catalogs/professionals/actions", () => ({
  createHealthcareProfessionalAction: vi.fn(),
}));

const EMPTY_CATALOG_FIELD: CatalogFieldData = {
  catalog: "health_insurance",
  options: [],
  canCreate: false,
};

const GUEST_ID = "00000000-0000-4000-8000-000000000001";
const VERSION = "2026-11-20T12:00:00.000Z";

function renderEditForm() {
  render(
    <GuestForm
      mode={{ kind: "edit", guestId: GUEST_ID, version: VERSION }}
      initialGuest={{
        ...buildEmptyGuest("2026-11-18"),
        firstName: "Persona",
        lastName: "Ficticia",
        birthDate: "1950-01-01",
        dni: "11222333",
        address: "Calle Ficticia 123",
      }}
      catalogFields={{
        healthInsurance: EMPTY_CATALOG_FIELD,
        hospitalizationReason: EMPTY_CATALOG_FIELD,
        uncontrolledSymptom: EMPTY_CATALOG_FIELD,
      }}
      today="2026-11-20"
    />,
  );
}

function renderForm() {
  render(
    <GuestForm
      mode={{ kind: "create" }}
      initialGuest={buildEmptyGuest("2026-11-20")}
      catalogFields={{
        healthInsurance: EMPTY_CATALOG_FIELD,
        hospitalizationReason: EMPTY_CATALOG_FIELD,
        uncontrolledSymptom: EMPTY_CATALOG_FIELD,
      }}
      today="2026-11-20"
    />,
  );
}

describe("GuestForm", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("RF-UX-02: marca como obligatorios los datos que pide la ERS", () => {
    renderForm();

    for (const label of ["Nombre", "Apellido", "DNI", "Dirección"]) {
      expect(
        screen.getByRole("textbox", { name: new RegExp(`^${label}`) }),
      ).toBeRequired();
    }
    expect(
      screen.getByRole("textbox", { name: /^Número de afiliado/ }),
    ).not.toBeRequired();
  });

  it("RF-HUE-03: propone la fecha de internación de hoy", () => {
    renderForm();

    expect(
      screen.getByRole("textbox", { name: /^Fecha de internación/ }),
    ).toHaveValue("20/11/2026");
  });

  it("R-13: avisa el DNI repetido y la entrevista pendiente al salir del campo, sin impedir el guardado", async () => {
    vi.mocked(checkGuestDniAction).mockResolvedValue({
      hasActiveGuest: true,
      hasPendingInterview: true,
      pendingInterviewHref: "/admisiones/00000000-0000-4000-8000-000000000003",
    });
    renderForm();

    const dni = screen.getByRole("textbox", { name: /^DNI/ });
    fireEvent.change(dni, { target: { value: "11.222.333" } });
    fireEvent.blur(dni);

    expect(
      await screen.findByText(/Ya hay otro huésped vigente con este DNI/),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Hay una entrevista de admisión con este DNI/),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "Ver la entrevista" }),
    ).toHaveAttribute(
      "href",
      "/admisiones/00000000-0000-4000-8000-000000000003",
    );
    expect(
      screen.getByRole("button", { name: "Guardar huésped" }),
    ).toBeEnabled();
  });

  it("RF-HUE-03: si el servidor rechaza, conserva lo escrito y muestra el error junto al campo", async () => {
    vi.mocked(createGuestManuallyAction).mockResolvedValue({
      status: "invalid",
      fieldErrors: { dni: ["El DNI debe tener 7 u 8 números."] },
    });
    renderForm();

    fireEvent.change(screen.getByRole("textbox", { name: /^Nombre/ }), {
      target: { value: "Conservada" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Guardar huésped" }));

    expect(
      await screen.findByText("El DNI debe tener 7 u 8 números."),
    ).toBeInTheDocument();
    expect(screen.getByRole("textbox", { name: /^Nombre/ })).toHaveValue(
      "Conservada",
    );
    expect(push).not.toHaveBeenCalled();
  });

  it("RF-HUE-03: al crear abre la ficha del huésped", async () => {
    vi.mocked(createGuestManuallyAction).mockResolvedValue({
      status: "success",
      guestId: "00000000-0000-4000-8000-000000000001",
      clinicalRecordNumber: 102,
    });
    renderForm();

    fireEvent.click(screen.getByRole("button", { name: "Guardar huésped" }));

    await waitFor(() => {
      expect(push).toHaveBeenCalledWith(
        "/huespedes/00000000-0000-4000-8000-000000000001",
      );
    });
  });

  it("RF-HUE-05: en edición trae los datos guardados y Cancelar vuelve a la ficha", () => {
    renderEditForm();

    expect(screen.getByRole("textbox", { name: /^Dirección/ })).toHaveValue(
      "Calle Ficticia 123",
    );
    expect(
      screen.getByRole("textbox", { name: /^Fecha de internación/ }),
    ).toHaveValue("18/11/2026");
    expect(screen.getByRole("link", { name: "Cancelar" })).toHaveAttribute(
      "href",
      `/huespedes/${GUEST_ID}`,
    );
  });

  it("RF-HUE-05: al guardar envía la versión editada y vuelve a la ficha", async () => {
    vi.mocked(updateGuestAction).mockResolvedValue({ status: "success" });
    renderEditForm();

    fireEvent.change(screen.getByRole("textbox", { name: /^Dirección/ }), {
      target: { value: "Otra Calle Ficticia 456" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Guardar cambios" }));

    await waitFor(() => {
      expect(updateGuestAction).toHaveBeenCalledWith(
        GUEST_ID,
        VERSION,
        expect.objectContaining({ address: "Otra Calle Ficticia 456" }),
      );
    });
    await waitFor(() => {
      expect(push).toHaveBeenCalledWith(`/huespedes/${GUEST_ID}`);
    });
  });

  it("R-13: en edición avisa el DNI repetido excluyendo al propio huésped y no sugiere aceptar entrevistas", async () => {
    vi.mocked(checkGuestDniAction).mockResolvedValue({
      hasActiveGuest: true,
      hasPendingInterview: true,
      pendingInterviewHref: null,
    });
    renderEditForm();

    fireEvent.blur(screen.getByRole("textbox", { name: /^DNI/ }));

    expect(
      await screen.findByText(/Ya hay otro huésped vigente con este DNI/),
    ).toBeInTheDocument();
    expect(checkGuestDniAction).toHaveBeenCalledWith("11222333", GUEST_ID);
    expect(
      screen.queryByText(/Hay una entrevista de admisión con este DNI/),
    ).not.toBeInTheDocument();
  });
});
