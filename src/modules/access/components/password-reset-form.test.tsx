import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { toast } from "sonner";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { authClient } from "../auth-client";
import { PasswordResetForm } from "./password-reset-form";
import { PASSWORD_RESET_MESSAGES } from "./password-reset-messages";

const replace = vi.fn();

vi.mock("next/navigation", () => ({ useRouter: () => ({ replace }) }));
vi.mock("sonner", () => ({ toast: { error: vi.fn(), success: vi.fn() } }));
vi.mock("../auth-client", () => ({
  authClient: { resetPassword: vi.fn() },
}));

const resetPassword = vi.mocked(authClient.resetPassword);
const NEW_PASSWORD = "otra-clave-de-prueba-larga";

function fillAndSubmit(password: string, confirmation: string) {
  fireEvent.change(screen.getByLabelText(/^Contraseña/), {
    target: { value: password },
  });
  fireEvent.change(screen.getByLabelText(/Repetí la contraseña/), {
    target: { value: confirmation },
  });
  fireEvent.click(screen.getByRole("button", { name: "Guardar contraseña" }));
}

describe("PasswordResetForm", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("RF-ACC-05: guarda la contraseña nueva y vuelve al inicio de sesión", async () => {
    resetPassword.mockResolvedValue({ data: { status: true }, error: null });
    render(<PasswordResetForm token="token-ficticio" labelledBy="titulo" />);

    fillAndSubmit(NEW_PASSWORD, NEW_PASSWORD);

    await waitFor(() =>
      expect(replace).toHaveBeenCalledWith("/iniciar-sesion"),
    );
    expect(resetPassword).toHaveBeenCalledWith({
      token: "token-ficticio",
      newPassword: NEW_PASSWORD,
    });
    expect(toast.success).toHaveBeenCalledWith(PASSWORD_RESET_MESSAGES.done);
  });

  it("RF-ACC-04: no envía si la confirmación no coincide", () => {
    render(<PasswordResetForm token="token-ficticio" labelledBy="titulo" />);

    fillAndSubmit(NEW_PASSWORD, "otra-cosa-distinta-larga");

    expect(screen.getByText("Las contraseñas no coinciden.")).toBeVisible();
    expect(resetPassword).not.toHaveBeenCalled();
  });

  it("RF-ACC-05: informa que el enlace venció", async () => {
    resetPassword.mockResolvedValue({
      data: null,
      error: {
        status: 400,
        statusText: "",
        message: "",
        code: "INVALID_TOKEN",
      },
    });
    render(<PasswordResetForm token="token-vencido" labelledBy="titulo" />);

    fillAndSubmit(NEW_PASSWORD, NEW_PASSWORD);

    await waitFor(() =>
      expect(toast.error).toHaveBeenCalledWith(
        PASSWORD_RESET_MESSAGES.invalidLink,
      ),
    );
    expect(replace).not.toHaveBeenCalled();
  });
});
