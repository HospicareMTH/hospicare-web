import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { toast } from "sonner";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { authClient } from "../auth-client";
import { TwoFactorForm } from "./two-factor-form";

const replace = vi.fn();
const refresh = vi.fn();

vi.mock("next/navigation", () => ({ useRouter: () => ({ replace, refresh }) }));
vi.mock("sonner", () => ({ toast: { error: vi.fn(), success: vi.fn() } }));
vi.mock("../auth-client", () => ({
  authClient: {
    twoFactor: {
      verifyTotp: vi.fn(),
      verifyOtp: vi.fn(),
      verifyBackupCode: vi.fn(),
      sendOtp: vi.fn(),
    },
  },
}));

const { verifyTotp, verifyOtp, verifyBackupCode, sendOtp } = vi.mocked(
  authClient.twoFactor,
);
const SUCCESS = { data: { token: "token" }, error: null };

function submitCode(label: RegExp, code: string) {
  fireEvent.change(screen.getByLabelText(label), { target: { value: code } });
  fireEvent.click(screen.getByRole("button", { name: "Verificar" }));
}

describe("TwoFactorForm", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.history.replaceState({}, "", "/2fa?redirectTo=%2Fhuespedes%2F42");
  });

  it("RF-ACC-12, 8.4: verifica con la aplicación y vuelve a la pantalla pedida", async () => {
    verifyTotp.mockResolvedValue(SUCCESS);
    render(<TwoFactorForm labelledBy="titulo" />);

    submitCode(/Código de la aplicación/, "123456");

    await waitFor(() => expect(replace).toHaveBeenCalledWith("/huespedes/42"));
    expect(verifyTotp).toHaveBeenCalledWith({ code: "123456" });
  });

  it("RF-ACC-12: al elegir el correo envía el código y lo verifica", async () => {
    sendOtp.mockResolvedValue({ data: { status: true }, error: null });
    verifyOtp.mockResolvedValue(SUCCESS);
    render(<TwoFactorForm labelledBy="titulo" />);

    fireEvent.click(
      screen.getByRole("button", { name: "Usar código por correo" }),
    );
    await waitFor(() => expect(sendOtp).toHaveBeenCalled());
    submitCode(/Código del correo/, "654321");

    await waitFor(() =>
      expect(verifyOtp).toHaveBeenCalledWith({ code: "654321" }),
    );
  });

  it("RF-ACC-12: acepta un código de respaldo", async () => {
    verifyBackupCode.mockResolvedValue(SUCCESS);
    render(<TwoFactorForm labelledBy="titulo" />);

    fireEvent.click(
      screen.getByRole("button", { name: "Usar código de respaldo" }),
    );
    submitCode(/Código de respaldo/, "abcde-12345");

    await waitFor(() =>
      expect(verifyBackupCode).toHaveBeenCalledWith({ code: "abcde-12345" }),
    );
  });

  it.each([
    [400, "INVALID_CODE", "El código no es correcto o ya venció."],
    [
      401,
      "INVALID_TWO_FACTOR_COOKIE",
      "Tu ingreso venció. Volvé a iniciar sesión.",
    ],
    [
      429,
      undefined,
      "Hiciste demasiados intentos. Esperá un minuto y volvé a probar.",
    ],
  ])(
    'RF-UX-01: ante %i %s avisa "%s" y no navega',
    async (status, code, message) => {
      verifyTotp.mockResolvedValue({
        data: null,
        error: { status, statusText: "", message: "", code },
      });
      render(<TwoFactorForm labelledBy="titulo" />);

      submitCode(/Código de la aplicación/, "000000");

      await waitFor(() => expect(toast.error).toHaveBeenCalledWith(message));
      expect(replace).not.toHaveBeenCalled();
    },
  );
});
