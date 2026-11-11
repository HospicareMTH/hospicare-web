import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { toast } from "sonner";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { authClient } from "../auth-client";
import { AccountPasswordPanel } from "./account-password-panel";

vi.mock("sonner", () => ({ toast: { error: vi.fn(), success: vi.fn() } }));
vi.mock("../auth-client", () => ({
  authClient: { changePassword: vi.fn() },
}));

const changePassword = vi.mocked(authClient.changePassword);
const CURRENT_PASSWORD = "clave-de-prueba-larga";
const NEW_PASSWORD = "otra-clave-de-prueba-larga";

function fillAndSubmit(confirmation: string) {
  fireEvent.change(screen.getByLabelText(/Contraseña actual/), {
    target: { value: CURRENT_PASSWORD },
  });
  fireEvent.change(screen.getByLabelText(/^Contraseña nueva/), {
    target: { value: NEW_PASSWORD },
  });
  fireEvent.change(screen.getByLabelText(/Repetí la contraseña nueva/), {
    target: { value: confirmation },
  });
  fireEvent.click(screen.getByRole("button", { name: "Cambiar contraseña" }));
}

describe("AccountPasswordPanel", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("RF-ACC-16: pide la actual y cierra las otras sesiones", async () => {
    changePassword.mockResolvedValue({
      data: {
        token: null,
        user: {
          id: "usuario-ficticio",
          name: "Persona Ficticia",
          email: "persona.ficticia@hospicare.test",
          emailVerified: true,
          image: null,
          createdAt: new Date(),
          updatedAt: new Date(),
          twoFactorEnabled: false,
        },
      },
      error: null,
    });
    render(<AccountPasswordPanel isEmailVerified />);

    fillAndSubmit(NEW_PASSWORD);

    await waitFor(() =>
      expect(changePassword).toHaveBeenCalledWith({
        currentPassword: CURRENT_PASSWORD,
        newPassword: NEW_PASSWORD,
        revokeOtherSessions: true,
      }),
    );
    expect(toast.success).toHaveBeenCalled();
  });

  it("RF-ACC-16: no envía si la confirmación no coincide", () => {
    render(<AccountPasswordPanel isEmailVerified />);

    fillAndSubmit("otra-cosa-distinta-larga");

    expect(screen.getByText("Las contraseñas no coinciden.")).toBeVisible();
    expect(changePassword).not.toHaveBeenCalled();
  });

  it("RF-ACC-10: sin correo verificado no ofrece el cambio", () => {
    render(<AccountPasswordPanel isEmailVerified={false} />);

    expect(
      screen.getByText("Verificá tu correo para poder cambiar tu contraseña."),
    ).toBeVisible();
    expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
  });

  it("RF-ACC-16: avisa si la contraseña actual no es correcta", async () => {
    changePassword.mockResolvedValue({
      data: null,
      error: {
        status: 400,
        statusText: "",
        message: "",
        code: "INVALID_PASSWORD",
      },
    });
    render(<AccountPasswordPanel isEmailVerified />);

    fillAndSubmit(NEW_PASSWORD);

    await waitFor(() =>
      expect(toast.error).toHaveBeenCalledWith("La contraseña no es correcta."),
    );
  });
});
