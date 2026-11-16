import { describe, expect, it } from "vitest";

import {
  ACCOUNT_SECURITY_MESSAGES,
  describeAccountSecurityError,
} from "./account-security-messages";

describe("describeAccountSecurityError", () => {
  it("RF-ACC-09: avisa que el código quedó bloqueado y que hay que pedir otro", () => {
    expect(
      describeAccountSecurityError({ status: 403, code: "TOO_MANY_ATTEMPTS" }),
    ).toBe(ACCOUNT_SECURITY_MESSAGES.codeLocked);
  });

  it("RF-ACC-09: distingue un código incorrecto de uno bloqueado", () => {
    expect(
      describeAccountSecurityError({ status: 400, code: "INVALID_OTP" }),
    ).toBe(ACCOUNT_SECURITY_MESSAGES.invalidCode);
  });

  it("RF-ACC-16: ante el límite de intentos pide esperar unos minutos", () => {
    expect(describeAccountSecurityError({ status: 429 })).toBe(
      "Hiciste demasiados intentos. Esperá unos minutos y volvé a probar.",
    );
  });
});
