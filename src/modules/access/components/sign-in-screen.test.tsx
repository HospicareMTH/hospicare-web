import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { SignInScreen } from "./sign-in-screen";

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
      screen.getByRole("button", { name: "¿Olvidaste tu contraseña?" }),
    ).toBeInTheDocument();
  });

  it("RF-UX-02: marca correo y contraseña como obligatorios", () => {
    render(<SignInScreen />);

    expect(getEmailInput()).toBeRequired();
    expect(getPasswordInput()).toBeRequired();
    expect(screen.getAllByText("*")).toHaveLength(2);
  });

  it("RNF-17: muestra el logo del hospice", () => {
    render(<SignInScreen />);

    expect(
      screen.getAllByAltText("Hospice Madre Teresa").length,
    ).toBeGreaterThan(0);
  });

  it("no envía los datos mientras el ingreso no esté disponible", () => {
    const { container } = render(<SignInScreen />);

    expect(container.querySelector('[type="submit"]')).toBeNull();
    expect(screen.getByRole("button", { name: "Ingresar" })).toHaveAttribute(
      "type",
      "button",
    );
  });
});
