import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { toast } from "sonner";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { updateLastClinicalRecordNumberAction } from "../actions";
import { ClinicalRecordNumberForm } from "./clinical-record-number-form";

vi.mock("../actions", () => ({
  updateLastClinicalRecordNumberAction: vi.fn(),
}));
vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn(), info: vi.fn() },
}));

function typeNumberAndSave(value: string) {
  fireEvent.change(
    screen.getByRole("textbox", { name: /Último número asignado/ }),
    { target: { value } },
  );
  fireEvent.click(screen.getByRole("button", { name: "Guardar número" }));
}

describe("ClinicalRecordNumberForm", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("RF-ROL-09: con permiso de ver solamente muestra el número sin formulario", () => {
    render(
      <ClinicalRecordNumberForm lastAssignedNumber={101} canUpdate={false} />,
    );

    expect(screen.getByText("101")).toBeInTheDocument();
    expect(
      screen.getByText("El próximo huésped va a recibir el número 102."),
    ).toBeInTheDocument();
    expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Guardar número" }),
    ).not.toBeInTheDocument();
  });

  it("RF-CFG-04, RF-UX-02: marca el campo como obligatorio y muestra el próximo número", () => {
    render(<ClinicalRecordNumberForm lastAssignedNumber={0} canUpdate />);

    const field = screen.getByRole("textbox", {
      name: /Último número asignado/,
    });
    expect(field).toBeRequired();
    expect(field).toHaveAccessibleDescription(
      "El próximo huésped va a recibir el número 1.",
    );
  });

  it("RF-CFG-04: un número menor se rechaza junto al campo, sin abrir la confirmación", () => {
    render(<ClinicalRecordNumberForm lastAssignedNumber={101} canUpdate />);

    typeNumberAndSave("50");

    expect(
      screen.getByText(
        "El número no puede ser menor que 101, el último que ya se asignó.",
      ),
    ).toBeInTheDocument();
    expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
    expect(updateLastClinicalRecordNumberAction).not.toHaveBeenCalled();
  });

  it("RF-UX-01: el mismo número informa que no hubo cambios", () => {
    render(<ClinicalRecordNumberForm lastAssignedNumber={101} canUpdate />);

    typeNumberAndSave("101");

    expect(toast.info).toHaveBeenCalledWith(
      "El último número asignado ya es 101. No hubo cambios.",
    );
    expect(updateLastClinicalRecordNumberAction).not.toHaveBeenCalled();
  });

  it("RF-CFG-04, RF-UX-03: confirma el número nuevo y avisa que no se puede volver atrás", async () => {
    vi.mocked(updateLastClinicalRecordNumberAction).mockResolvedValue({
      status: "success",
    });
    render(<ClinicalRecordNumberForm lastAssignedNumber={0} canUpdate />);

    typeNumberAndSave("101");

    const dialog = await screen.findByRole("alertdialog", {
      name: "¿Guardar el número 101?",
    });
    expect(dialog).toHaveTextContent(
      "El próximo huésped va a recibir el número 102. Después no vas a poder volver a un número menor que 101.",
    );
    fireEvent.click(screen.getByRole("button", { name: "Guardar número" }));

    await waitFor(() => {
      expect(updateLastClinicalRecordNumberAction).toHaveBeenCalledWith({
        lastClinicalRecordNumber: "101",
      });
    });
    await waitFor(() => {
      expect(toast.success).toHaveBeenCalledWith("Guardaste el número 101.");
    });
  });

  it("RF-CFG-04: si el servidor rechaza el número, el aviso aparece junto al campo", async () => {
    vi.mocked(updateLastClinicalRecordNumberAction).mockResolvedValue({
      status: "invalid",
      fieldErrors: {
        lastClinicalRecordNumber: [
          "El número no puede ser menor que 120, el último que ya se asignó.",
        ],
      },
    });
    render(<ClinicalRecordNumberForm lastAssignedNumber={0} canUpdate />);

    typeNumberAndSave("101");
    await screen.findByRole("alertdialog");
    fireEvent.click(screen.getByRole("button", { name: "Guardar número" }));

    expect(
      await screen.findByText(
        "El número no puede ser menor que 120, el último que ya se asignó.",
      ),
    ).toBeInTheDocument();
  });
});
