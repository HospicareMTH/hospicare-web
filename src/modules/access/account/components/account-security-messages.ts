import { EMAIL_NOT_VERIFIED_ERROR_CODE } from "../../auth/schemas";

const TOO_MANY_REQUESTS_STATUS = 429;
const INVALID_PASSWORD_ERROR_CODE = "INVALID_PASSWORD";
const CODE_LOCKED_ERROR_CODE = "TOO_MANY_ATTEMPTS";
const INVALID_CODE_ERROR_CODES = new Set([
  "INVALID_CODE",
  "INVALID_OTP",
  "OTP_EXPIRED",
]);

export const ACCOUNT_SECURITY_MESSAGES = {
  invalidPassword: "La contraseña no es correcta.",
  invalidCode: "El código no es correcto o ya venció.",
  codeLocked:
    "Hiciste demasiados intentos con este código. Tocá «Enviar otro código» para recibir uno nuevo.",
  emailNotVerified:
    "Primero verificá tu correo, en la parte de Correo de esta pantalla.",
  tooManyAttempts:
    "Hiciste demasiados intentos. Esperá unos minutos y volvé a probar.",
  unavailable:
    "No pudimos confirmar si se completó. Actualizá la pantalla para ver cómo quedó y, si hace falta, volvé a probar.",
  passwordChangeUnconfirmed:
    "No pudimos confirmar si se guardó la contraseña nueva. Probá cambiarla otra vez: si te dice que la contraseña actual no es correcta, la nueva ya quedó guardada.",
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
  if (code === CODE_LOCKED_ERROR_CODE) {
    return ACCOUNT_SECURITY_MESSAGES.codeLocked;
  }
  if (code && INVALID_CODE_ERROR_CODES.has(code)) {
    return ACCOUNT_SECURITY_MESSAGES.invalidCode;
  }
  return ACCOUNT_SECURITY_MESSAGES.unavailable;
}
