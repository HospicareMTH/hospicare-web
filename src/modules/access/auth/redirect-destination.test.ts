import { describe, expect, it } from "vitest";

import { buildSignInPath, getSafeDestination } from "./redirect-destination";

describe("buildSignInPath", () => {
  it("RF-ACC-03: conserva el destino pedido al mandar al inicio de sesión", () => {
    expect(buildSignInPath("/huespedes/42?tab=cam")).toBe(
      "/iniciar-sesion?redirectTo=%2Fhuespedes%2F42%3Ftab%3Dcam",
    );
  });

  it("RF-ACC-03: desde el Inicio manda al inicio de sesión sin destino", () => {
    expect(buildSignInPath("/")).toBe("/iniciar-sesion");
  });

  it("RF-ACC-03: descarta un destino externo", () => {
    expect(buildSignInPath("//sitio-ajeno.example")).toBe("/iniciar-sesion");
  });

  it("RF-ACC-03: el destino armado vuelve igual al leerlo", () => {
    const signInPath = buildSignInPath("/huespedes/42?tab=cam");
    const search = signInPath.slice(signInPath.indexOf("?"));

    expect(getSafeDestination(search)).toBe("/huespedes/42?tab=cam");
  });
});

describe("getSafeDestination", () => {
  it("RF-ACC-02: vuelve a la ruta interna pedida", () => {
    expect(
      getSafeDestination("?redirectTo=%2Fhuespedes%2F42%3Ftab%3Dcam"),
    ).toBe("/huespedes/42?tab=cam");
  });

  it("RF-ACC-02: sin destino pedido, va al Inicio", () => {
    expect(getSafeDestination("")).toBe("/");
  });

  it.each([
    "https://sitio-ajeno.example",
    "//sitio-ajeno.example",
    "/\\sitio-ajeno.example",
    "javascript:alert(1)",
  ])("RF-ACC-02: ignora el destino externo %s", (destination) => {
    expect(
      getSafeDestination(`?redirectTo=${encodeURIComponent(destination)}`),
    ).toBe("/");
  });
});
