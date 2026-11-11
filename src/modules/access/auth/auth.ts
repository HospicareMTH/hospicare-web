import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import {
  APIError,
  createAuthMiddleware,
  getSessionFromCtx,
  isAPIError,
} from "better-auth/api";
import { emailOTP, twoFactor } from "better-auth/plugins";
import { z } from "zod";

import { getDatabase } from "@/platform/database/client";

import {
  ACCESS_REVOKED_ERROR_CODE,
  EMAIL_NOT_VERIFIED_ERROR_CODE,
} from "./schemas";
import { PASSWORD_MAX_LENGTH, PASSWORD_MIN_LENGTH } from "../schemas";
import {
  CLIENT_IP_HEADER,
  EMAIL_VERIFICATION_CODE_VALIDITY_SECONDS,
  isUserAccessRevoked,
  PASSWORD_RESET_VALIDITY_SECONDS,
  recordFailedSignInAttempt,
  sendEmailVerificationCode,
  sendPasswordResetMail,
  sendTwoFactorCode,
  TWO_FACTOR_CODE_VALIDITY_MINUTES,
} from "./service";
import {
  accounts,
  rateLimits,
  sessions,
  twoFactors,
  users,
  verifications,
} from "../tables";

const SECONDS_PER_DAY = 86_400;
const SESSION_DURATION_SECONDS = 7 * SECONDS_PER_DAY;
const SESSION_RENEWAL_SECONDS = SECONDS_PER_DAY;
const RATE_LIMIT_WINDOW_SECONDS = 60;
const AUTH_REQUESTS_PER_WINDOW = 60;
const SIGN_IN_ATTEMPTS_PER_WINDOW = 5;
const SIGN_IN_ENDPOINT_PATH = "/sign-in/email";
const SECONDS_PER_HOUR = 3_600;
const PASSWORD_RESET_ATTEMPTS_PER_HOUR = 5;
const PASSWORD_CHANGE_PATH = "/change-password";
const PASSWORD_CHANGE_WINDOW_SECONDS = 600;
const PASSWORD_CHANGE_ATTEMPTS_PER_WINDOW = 5;
const PASSWORD_RESET_REQUEST_ENDPOINT_PATH = "/request-password-reset";
const PASSWORD_RESET_ENDPOINT_PATH = "/reset-password";
const TWO_FACTOR_VERIFICATION_PATHS = "/two-factor/verify-*";
const TWO_FACTOR_PATHS = "/two-factor/*";
const TWO_FACTOR_ATTEMPTS_PER_WINDOW = 5;
const EMAIL_VERIFICATION_SEND_PATH = "/email-otp/send-verification-otp";
const EMAIL_VERIFICATION_PATH = "/email-otp/verify-email";
const EMAIL_VERIFICATION_SENDS_PER_WINDOW = 3;
const EMAIL_VERIFICATION_OTP_TYPE = "email-verification";
const TWO_FACTOR_ENABLE_PATH = "/two-factor/enable";
const VERIFIED_EMAIL_REQUIRED_PATHS = new Set([
  TWO_FACTOR_ENABLE_PATH,
  "/two-factor/disable",
  "/two-factor/generate-backup-codes",
  "/two-factor/get-totp-uri",
  PASSWORD_CHANGE_PATH,
]);
// /update-user no valida el nombre según la ERS: el nombre se edita con updateOwnNameAction.
const DISABLED_PATHS = [
  "/update-user",
  "/email-otp/check-verification-otp",
  "/sign-in/email-otp",
  "/email-otp/request-password-reset",
  "/forget-password/email-otp",
  "/email-otp/reset-password",
  "/email-otp/request-email-change",
  "/email-otp/change-email",
];
const TWO_FACTOR_ISSUER = "Hospicare";
const ONE_TIME_CODE_DIGITS = 6;
const TOTP_PERIOD_SECONDS = 30;
const ONE_TIME_CODE_ATTEMPTS = 5;
const BACKUP_CODE_AMOUNT = 10;
const BACKUP_CODE_LENGTH = 10;
const INVALID_CREDENTIALS_STATUS_CODE = 401;
const MINIMUM_SECRET_LENGTH = 32;

const authEnvironmentSchema = z.object({
  BETTER_AUTH_SECRET: z.string().min(MINIMUM_SECRET_LENGTH, {
    error: `BETTER_AUTH_SECRET debe tener al menos ${MINIMUM_SECRET_LENGTH} caracteres.`,
  }),
  BETTER_AUTH_URL: z.url({ error: "BETTER_AUTH_URL debe ser una URL." }),
});

const recordFailedSignInMiddleware = createAuthMiddleware(async (context) => {
  if (context.path !== SIGN_IN_ENDPOINT_PATH) {
    return;
  }
  const returned = context.context.returned;
  if (
    !isAPIError(returned) ||
    returned.statusCode !== INVALID_CREDENTIALS_STATUS_CODE
  ) {
    return;
  }

  try {
    await recordFailedSignInAttempt({
      body: context.body,
      headers: context.headers,
    });
  } catch (error) {
    console.error("No se pudo registrar el inicio de sesión fallido.", error);
  }
});

const ownEmailVerificationBodySchema = z.object({
  email: z.string(),
  type: z.literal(EMAIL_VERIFICATION_OTP_TYPE).optional(),
});

// RF-ACC-11: el segundo factor se activa solo con aplicación autenticadora.
const authenticatorEnableBodySchema = z.object({
  method: z.literal("totp").optional(),
});

// RF-ACC-16: cambiar la contraseña siempre cierra las otras sesiones.
const passwordChangeBodySchema = z.object({
  revokeOtherSessions: z.literal(true),
});

const guardAccountSecurityMiddleware = createAuthMiddleware(async (context) => {
  const isEmailVerification =
    context.path === EMAIL_VERIFICATION_SEND_PATH ||
    context.path === EMAIL_VERIFICATION_PATH;
  const requiresVerifiedEmail = VERIFIED_EMAIL_REQUIRED_PATHS.has(context.path);
  if (!isEmailVerification && !requiresVerifiedEmail) {
    return;
  }

  const session = await getSessionFromCtx(context);
  if (!session) {
    throw new APIError("UNAUTHORIZED");
  }
  if (isEmailVerification) {
    const body = ownEmailVerificationBodySchema.safeParse(context.body);
    if (
      !body.success ||
      body.data.email.toLowerCase() !== session.user.email.toLowerCase()
    ) {
      throw new APIError("FORBIDDEN");
    }
  }
  if (requiresVerifiedEmail && !session.user.emailVerified) {
    throw new APIError("FORBIDDEN", {
      code: EMAIL_NOT_VERIFIED_ERROR_CODE,
      message: "Verificá tu correo para hacer esta acción.",
    });
  }
  if (
    context.path === TWO_FACTOR_ENABLE_PATH &&
    !authenticatorEnableBodySchema.safeParse(context.body).success
  ) {
    throw new APIError("BAD_REQUEST");
  }
  if (
    context.path === PASSWORD_CHANGE_PATH &&
    !passwordChangeBodySchema.safeParse(context.body).success
  ) {
    throw new APIError("BAD_REQUEST");
  }
});

function createAuth() {
  const environment = authEnvironmentSchema.parse(process.env);

  return betterAuth({
    secret: environment.BETTER_AUTH_SECRET,
    baseURL: environment.BETTER_AUTH_URL,
    database: drizzleAdapter(getDatabase(), {
      provider: "pg",
      transaction: true,
      schema: {
        user: users,
        session: sessions,
        account: accounts,
        verification: verifications,
        rateLimit: rateLimits,
        twoFactor: twoFactors,
      },
    }),
    emailAndPassword: {
      enabled: true,
      disableSignUp: true,
      minPasswordLength: PASSWORD_MIN_LENGTH,
      maxPasswordLength: PASSWORD_MAX_LENGTH,
      resetPasswordTokenExpiresIn: PASSWORD_RESET_VALIDITY_SECONDS,
      revokeSessionsOnPasswordReset: true,
      sendResetPassword: ({ user, url }) => sendPasswordResetMail(user, url),
    },
    verification: { storeIdentifier: "hashed" },
    disabledPaths: DISABLED_PATHS,
    plugins: [
      twoFactor({
        issuer: TWO_FACTOR_ISSUER,
        totpOptions: {
          digits: ONE_TIME_CODE_DIGITS,
          period: TOTP_PERIOD_SECONDS,
        },
        otpOptions: {
          period: TWO_FACTOR_CODE_VALIDITY_MINUTES,
          digits: ONE_TIME_CODE_DIGITS,
          allowedAttempts: ONE_TIME_CODE_ATTEMPTS,
          storeOTP: "encrypted",
          sendOTP: ({ user, otp }) => sendTwoFactorCode(user.email, otp),
        },
        backupCodeOptions: {
          amount: BACKUP_CODE_AMOUNT,
          length: BACKUP_CODE_LENGTH,
          storeBackupCodes: "encrypted",
        },
        accountLockout: { enabled: false },
      }),
      emailOTP({
        otpLength: ONE_TIME_CODE_DIGITS,
        expiresIn: EMAIL_VERIFICATION_CODE_VALIDITY_SECONDS,
        allowedAttempts: ONE_TIME_CODE_ATTEMPTS,
        storeOTP: "encrypted",
        disableSignUp: true,
        sendVerificationOTP: ({ email, otp }) =>
          sendEmailVerificationCode(email, otp),
      }),
    ],
    session: {
      expiresIn: SESSION_DURATION_SECONDS,
      updateAge: SESSION_RENEWAL_SECONDS,
    },
    rateLimit: {
      enabled: true,
      storage: "database",
      window: RATE_LIMIT_WINDOW_SECONDS,
      max: AUTH_REQUESTS_PER_WINDOW,
      customRules: {
        [SIGN_IN_ENDPOINT_PATH]: {
          window: RATE_LIMIT_WINDOW_SECONDS,
          max: SIGN_IN_ATTEMPTS_PER_WINDOW,
        },
        [PASSWORD_RESET_REQUEST_ENDPOINT_PATH]: {
          window: SECONDS_PER_HOUR,
          max: PASSWORD_RESET_ATTEMPTS_PER_HOUR,
        },
        [PASSWORD_RESET_ENDPOINT_PATH]: {
          window: SECONDS_PER_HOUR,
          max: PASSWORD_RESET_ATTEMPTS_PER_HOUR,
        },
        [TWO_FACTOR_VERIFICATION_PATHS]: {
          window: RATE_LIMIT_WINDOW_SECONDS,
          max: TWO_FACTOR_ATTEMPTS_PER_WINDOW,
        },
        [TWO_FACTOR_PATHS]: {
          window: RATE_LIMIT_WINDOW_SECONDS,
          max: AUTH_REQUESTS_PER_WINDOW,
        },
        [EMAIL_VERIFICATION_SEND_PATH]: {
          window: RATE_LIMIT_WINDOW_SECONDS,
          max: EMAIL_VERIFICATION_SENDS_PER_WINDOW,
        },
        [PASSWORD_CHANGE_PATH]: {
          window: PASSWORD_CHANGE_WINDOW_SECONDS,
          max: PASSWORD_CHANGE_ATTEMPTS_PER_WINDOW,
        },
        [EMAIL_VERIFICATION_PATH]: {
          window: RATE_LIMIT_WINDOW_SECONDS,
          max: AUTH_REQUESTS_PER_WINDOW,
        },
      },
    },
    advanced: {
      ipAddress: { ipAddressHeaders: [CLIENT_IP_HEADER] },
    },
    hooks: {
      before: guardAccountSecurityMiddleware,
      after: recordFailedSignInMiddleware,
    },
    databaseHooks: {
      session: {
        create: {
          before: async (session) => {
            if (await isUserAccessRevoked(session.userId)) {
              throw new APIError("FORBIDDEN", {
                code: ACCESS_REVOKED_ERROR_CODE,
                message: "Tu acceso está suspendido.",
              });
            }
          },
        },
      },
    },
  });
}

type Auth = ReturnType<typeof createAuth>;

let auth: Auth | undefined;

export function getAuth(): Auth {
  auth ??= createAuth();
  return auth;
}
