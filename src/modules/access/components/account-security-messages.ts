import { EMAIL_NOT_VERIFIED_ERROR_CODE } from "../schemas";

const TOO_MANY_REQUESTS_STATUS = 429;
const INVALID_PASSWORD_ERROR_CODE = "INVALID_PASSWORD";
const INVALID_CODE_ERROR_CODES = new Set([
  "INVALID_CODE",
  "INVALID_OTP",
  "OTP_EXPIRED",
  "TOO_MANY_ATTEMPTS",
]);

export const ACCOUNT_SECURITY_MESSAGES = {
  invalidPassword: "La contraseña no es correcta.",
  invalidCode: "El código no es correcto o ya venció.",
  emailNotVerified: "Verificá tu correo para hacer esta acción.",
  tooManyAttempts:
    "Hiciste demasiados intentos. Esperá un minuto y volvé a probar.",
  unavailable:
    "No pudimos completar la operación. Probá de nuevo en unos minutos.",
};

export function describeAccountSecurityError({
  status,
  code,
}: {
  status: number;
  code?: string;
}): string {
  if (status === TOO_MANY_REQUESTS_STATUS) {
    return ACCOUNT_SECURITY_MESSAGES.tooManyAttempts;
  }
  if (code === INVALID_PASSWORD_ERROR_CODE) {
    return ACCOUNT_SECURITY_MESSAGES.invalidPassword;
  }
  if (code === EMAIL_NOT_VERIFIED_ERROR_CODE) {
    return ACCOUNT_SECURITY_MESSAGES.emailNotVerified;
  }
  if (code && INVALID_CODE_ERROR_CODES.has(code)) {
    return ACCOUNT_SECURITY_MESSAGES.invalidCode;
  }
  return ACCOUNT_SECURITY_MESSAGES.unavailable;
}
