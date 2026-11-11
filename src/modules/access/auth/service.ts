import { recordFailedSignIn } from "@/modules/audit";
import { sendMail } from "@/platform/mail";

import {
  type AccessRevocationRecord,
  findAccessRevocation,
  findUserIdByEmail,
} from "./repository";
import { signInRequestBodySchema } from "./schemas";

export const CLIENT_IP_HEADER = "cf-connecting-ip";

const USER_AGENT_HEADER = "user-agent";

type SignInAttempt = {
  body: unknown;
  headers: Headers | undefined;
};

export async function recordFailedSignInAttempt({
  body,
  headers,
}: SignInAttempt): Promise<void> {
  const parsedBody = signInRequestBodySchema.safeParse(body);
  const targetUserId = parsedBody.success
    ? await findUserIdByEmail(parsedBody.data.email.toLowerCase())
    : null;

  await recordFailedSignIn({
    targetUserId,
    ipAddress: headers?.get(CLIENT_IP_HEADER) ?? null,
    userAgent: headers?.get(USER_AGENT_HEADER) ?? null,
  });
}

export function isAccessRevoked(
  record: AccessRevocationRecord,
  now: Date,
): boolean {
  return (
    record.accessRevokedAt !== null &&
    (record.accessRevokedUntil === null || record.accessRevokedUntil > now)
  );
}

export async function isUserAccessRevoked(userId: string): Promise<boolean> {
  const record = await findAccessRevocation(userId);
  return record !== null && isAccessRevoked(record, new Date());
}

const PASSWORD_RESET_VALIDITY_MINUTES = 30;

export const PASSWORD_RESET_VALIDITY_SECONDS =
  PASSWORD_RESET_VALIDITY_MINUTES * 60;

type PasswordResetRecipient = { id: string; name: string; email: string };

export async function sendPasswordResetMail(
  recipient: PasswordResetRecipient,
  resetUrl: string,
): Promise<void> {
  if (await isUserAccessRevoked(recipient.id)) {
    return;
  }
  try {
    await sendMail({
      to: recipient.email,
      subject: "Recuperá tu contraseña de Hospicare",
      text: `Hola ${recipient.name}: creá una contraseña nueva desde este enlace, que vence en ${PASSWORD_RESET_VALIDITY_MINUTES} minutos: ${resetUrl}. Si no lo pediste, ignorá este correo.`,
      actionUrl: resetUrl,
    });
  } catch (error) {
    // Se registra sin propagar: un error visible revelaría que el correo tiene cuenta.
    console.error("No se pudo enviar el correo de recuperación.", error);
  }
}

const EMAIL_VERIFICATION_CODE_VALIDITY_MINUTES = 5;

export const EMAIL_VERIFICATION_CODE_VALIDITY_SECONDS =
  EMAIL_VERIFICATION_CODE_VALIDITY_MINUTES * 60;

export const TWO_FACTOR_CODE_VALIDITY_MINUTES = 3;

export async function sendEmailVerificationCode(
  email: string,
  code: string,
): Promise<void> {
  await sendMail({
    to: email,
    subject: "Tu código de verificación de Hospicare",
    text: `Tu código es ${code}. Vence en ${EMAIL_VERIFICATION_CODE_VALIDITY_MINUTES} minutos.`,
    code,
  });
}

export async function sendTwoFactorCode(
  email: string,
  code: string,
): Promise<void> {
  await sendMail({
    to: email,
    subject: "Tu código para entrar a Hospicare",
    text: `Tu código es ${code}. Vence en ${TWO_FACTOR_CODE_VALIDITY_MINUTES} minutos.`,
    code,
  });
}
