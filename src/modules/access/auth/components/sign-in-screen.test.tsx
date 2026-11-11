import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { SignInScreen } from "./sign-in-screen";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: vi.fn(), refresh: vi.fn() }),
}));

function getEmailInput() {
  return screen.getByLabelText(/Correo electrónico/);
}

function getPasswordInput() {
  return screen.getByLabelText(/Contraseña/);
}

describe("SignInScreen", () => {
  it("RF-ACC-02: pide correo y contraseña", () => {
    render(<SignInScreen />);

    expect(
      screen.getByRole("heading", { level: 1, name: "Iniciar sesión" }),
    ).toBeInTheDocument();
    expect(getEmailInput()).toHaveAttribute("type", "email");
    expect(getPasswordInput()).toHaveAttribute("type", "password");
  });

  it("RF-ACC-01: no ofrece registrarse", () => {
    render(<SignInScreen />);

    expect(screen.queryByText(/registr|crear cuenta/i)).not.toBeInTheDocument();
  });

  it("RF-ACC-05: muestra la opción de recuperar la contraseña", () => {
    render(<SignInScreen />);

    expect(
      screen.getByRole("link", { name: "¿Olvidaste tu contraseña?" }),
    ).toHaveAttribute("href", "/recuperar-contrasena");
  });

  it("RF-UX-02: marca correo y contraseña como obligatorios", () => {
    render(<SignInScreen />);

    expect(getEmailInput()).toBeRequired();
    expect(getPasswordInput()).toBeRequired();
    expect(screen.getAllByText("*")).toHaveLength(2);
  });

  it("RF-ACC-02: el ícono de persona es decorativo y no se anuncia", () => {
    const { container } = render(<SignInScreen />);

    const decorativeIcons = container.querySelectorAll(
      '[aria-hidden="true"] svg',
    );
    expect(decorativeIcons.length).toBeGreaterThan(0);
    expect(screen.queryByRole("img", { name: /usuario|persona/i })).toBeNull();
  });

  it("RNF-17: muestra el logo del hospice", () => {
    render(<SignInScreen />);

    expect(
      screen.getAllByAltText("Hospice Madre Teresa").length,
    ).toBeGreaterThan(0);
  });
});
