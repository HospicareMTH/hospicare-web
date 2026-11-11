import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { toast } from "sonner";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { authClient } from "../auth-client";
import { SignInForm } from "./sign-in-form";

const replace = vi.fn();
const refresh = vi.fn();

vi.mock("next/navigation", () => ({ useRouter: () => ({ replace, refresh }) }));
vi.mock("sonner", () => ({ toast: { error: vi.fn() } }));
vi.mock("../auth-client", () => ({
  authClient: { signIn: { email: vi.fn() } },
}));

const signInEmail = vi.mocked(authClient.signIn.email);

function fillAndSubmit() {
  fireEvent.change(screen.getByLabelText(/Correo electrónico/), {
    target: { value: "ana.prueba@hospicare.test" },
  });
  fireEvent.change(screen.getByLabelText(/Contraseña/), {
    target: { value: "clave-de-prueba-larga" },
  });
  fireEvent.click(screen.getByRole("button", { name: "Ingresar" }));
}

function rejectWithStatus(status: number) {
  signInEmail.mockResolvedValue({
    data: null,
    error: { status, statusText: "", message: "" },
  });
}

describe("SignInForm", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.history.replaceState(
      {},
      "",
      "/iniciar-sesion?redirectTo=%2Fhuespedes%2F42",
    );
  });

  it("RF-ACC-02: envía correo y contraseña y vuelve a la pantalla pedida", async () => {
    signInEmail.mockResolvedValue({ data: null, error: null });
    render(<SignInForm labelledBy="titulo" />);

    fillAndSubmit();

    await waitFor(() => expect(replace).toHaveBeenCalledWith("/huespedes/42"));
    expect(signInEmail).toHaveBeenCalledWith({
      email: "ana.prueba@hospicare.test",
      password: "clave-de-prueba-larga",
    });
  });

  it("RF-ACC-12, 8.4: con segundo factor pasa a la verificación conservando el destino", async () => {
    signInEmail.mockResolvedValue({
      data: { twoFactorRedirect: true, twoFactorMethods: ["totp", "otp"] },
      error: null,
    });
    render(<SignInForm labelledBy="titulo" />);

    fillAndSubmit();

    await waitFor(() =>
      expect(replace).toHaveBeenCalledWith("/2fa?redirectTo=%2Fhuespedes%2F42"),
    );
  });

  it("RF-UX-05: informa que está ingresando mientras espera", () => {
    signInEmail.mockReturnValue(new Promise(() => undefined));
    render(<SignInForm labelledBy="titulo" />);

    fillAndSubmit();

    expect(screen.getByRole("button", { name: "Ingresando…" })).toBeDisabled();
  });

  it.each([
    [401, "El correo o la contraseña no son correctos."],
    [429, "Hiciste demasiados intentos. Esperá un minuto y volvé a probar."],
    [500, "No pudimos iniciar sesión. Probá de nuevo en unos minutos."],
  ])(
    'RF-UX-01: ante el estado %i avisa "%s" y no navega',
    async (status, message) => {
      rejectWithStatus(status);
      render(<SignInForm labelledBy="titulo" />);

      fillAndSubmit();

      await waitFor(() => expect(toast.error).toHaveBeenCalledWith(message));
      expect(replace).not.toHaveBeenCalled();
      expect(screen.getByRole("button", { name: "Ingresar" })).toBeEnabled();
    },
  );

  it("RF-UX-01: si no hay conexión avisa que pruebe más tarde", async () => {
    signInEmail.mockRejectedValue(new TypeError("Failed to fetch"));
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    render(<SignInForm labelledBy="titulo" />);

    fillAndSubmit();

    await waitFor(() =>
      expect(toast.error).toHaveBeenCalledWith(
        "No pudimos iniciar sesión. Probá de nuevo en unos minutos.",
      ),
    );
  });
});
