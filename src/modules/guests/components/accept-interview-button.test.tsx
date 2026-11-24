import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { toast } from "sonner";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { acceptAdmissionInterviewAction } from "../actions";
import { AcceptInterviewButton } from "./accept-interview-button";

vi.mock("../actions", () => ({
  acceptAdmissionInterviewAction: vi.fn(),
}));
vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn(), info: vi.fn() },
}));

const INTERVIEW_ID = "00000000-0000-4000-8000-000000000001";

function openConfirmation(hasActiveGuestWithSameDni: boolean) {
  render(
    <AcceptInterviewButton
      interviewId={INTERVIEW_ID}
      guestFullName="Rosa Ficticia"
      hasActiveGuestWithSameDni={hasActiveGuestWithSameDni}
    />,
  );
  fireEvent.click(screen.getByRole("button", { name: "Aceptar entrevista" }));
  return screen.getByRole("alertdialog", {
    name: "¿Aceptar la entrevista de Rosa Ficticia?",
  });
}

describe("AcceptInterviewButton", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("RF-HUE-02: la confirmación explica que se interna hoy con el próximo número", () => {
    const dialog = openConfirmation(false);

    expect(dialog).toHaveTextContent(
      "Se crea el huésped con fecha de internación de hoy y el próximo número de historia clínica.",
    );
    expect(dialog).not.toHaveTextContent("Ya hay otro huésped vigente");
  });

  it("R-13: la confirmación avisa un huésped vigente con el mismo DNI", () => {
    expect(openConfirmation(true)).toHaveTextContent(
      "Ya hay otro huésped vigente con este DNI: revisá que no sea la misma persona.",
    );
  });

  it("RF-ENT-06: al confirmar acepta la entrevista e informa el número asignado", async () => {
    vi.mocked(acceptAdmissionInterviewAction).mockResolvedValue({
      status: "success",
      guestId: "00000000-0000-4000-8000-000000000002",
      clinicalRecordNumber: 102,
      wasCreated: true,
    });
    const dialog = openConfirmation(false);

    fireEvent.click(
      within(dialog).getByRole("button", { name: "Aceptar entrevista" }),
    );

    await waitFor(() => {
      expect(acceptAdmissionInterviewAction).toHaveBeenCalledWith(INTERVIEW_ID);
    });
    await waitFor(() => {
      expect(toast.success).toHaveBeenCalledWith(
        "Creaste el huésped con historia clínica N.° 102.",
      );
    });
  });
});
