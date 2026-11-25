import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { toast } from "sonner";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { annulGuestAction } from "../actions";
import { AnnulGuestDialog, type GuestToAnnul } from "./annul-guest-dialog";

vi.mock("../actions", () => ({
  annulGuestAction: vi.fn(),
}));
vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn(), info: vi.fn() },
}));

const MANUAL_GUEST: GuestToAnnul = {
  id: "00000000-0000-4000-8000-000000000001",
  fullName: "Rosa Ficticia",
  clinicalRecordNumber: 102,
  origin: "manual",
};

const VALID_REASON = "Carga duplicada por error";

function renderDialog(guest: GuestToAnnul = MANUAL_GUEST) {
  const onClose = vi.fn();
  render(<AnnulGuestDialog guest={guest} onClose={onClose} />);
  const dialog = screen.getByRole("dialog", {
    name: `Anular al huésped ${guest.fullName}`,
  });
  return { dialog, onClose };
}

function submitReason(reason: string) {
  fireEvent.change(screen.getByRole("textbox", { name: "Motivo" }), {
    target: { value: reason },
  });
  fireEvent.click(screen.getByRole("button", { name: "Anular huésped" }));
}

describe("AnnulGuestDialog", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("RF-HUE-06, RF-HUE-07: explica que no se borra y que el número no se vuelve a usar", () => {
    const { dialog } = renderDialog();

    expect(dialog).toHaveTextContent(
      "No se borra: quedan registrados quién lo anuló, cuándo y el motivo.",
    );
    expect(dialog).toHaveTextContent(
      "Su número de historia clínica (N.° 102) no se vuelve a usar.",
    );
    expect(dialog).not.toHaveTextContent("Su entrevista vuelve a quedar");
  });

  it("RF-HUE-02: si vino de una entrevista, avisa que la entrevista vuelve a quedar sin aceptar", () => {
    const { dialog } = renderDialog({ ...MANUAL_GUEST, origin: "admission" });

    expect(dialog).toHaveTextContent(
      "Su entrevista vuelve a quedar sin aceptar. Si se acepta de nuevo, se crea otro huésped con otro número.",
    );
  });

  it("R-20: muestra el error del motivo junto al campo y no cierra", async () => {
    vi.mocked(annulGuestAction).mockResolvedValue({
      status: "invalid",
      fieldErrors: { reason: ["El motivo debe tener al menos 10 caracteres."] },
    });
    const { onClose } = renderDialog();

    submitReason("corto");

    expect(
      await screen.findByText("El motivo debe tener al menos 10 caracteres."),
    ).toBeInTheDocument();
    expect(screen.getByRole("textbox", { name: "Motivo" })).toHaveAttribute(
      "aria-invalid",
      "true",
    );
    expect(onClose).not.toHaveBeenCalled();
  });

  it("RF-HUE-06: al anular informa el resultado y cierra", async () => {
    vi.mocked(annulGuestAction).mockResolvedValue({ status: "success" });
    const { onClose } = renderDialog();

    submitReason(VALID_REASON);

    await waitFor(() => {
      expect(annulGuestAction).toHaveBeenCalledWith(MANUAL_GUEST.id, {
        reason: VALID_REASON,
      });
    });
    await waitFor(() => {
      expect(toast.success).toHaveBeenCalledWith("Huésped anulado.");
    });
    expect(onClose).toHaveBeenCalled();
  });
});
