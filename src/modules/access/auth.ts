import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { APIError, createAuthMiddleware, isAPIError } from "better-auth/api";
import { z } from "zod";

import { getDatabase } from "@/platform/database/client";

import {
  ACCESS_REVOKED_ERROR_CODE,
  PASSWORD_MAX_LENGTH,
  PASSWORD_MIN_LENGTH,
} from "./schemas";
import {
  CLIENT_IP_HEADER,
  isUserAccessRevoked,
  PASSWORD_RESET_VALIDITY_SECONDS,
  recordFailedSignInAttempt,
  sendPasswordResetMail,
} from "./service";
import { accounts, rateLimits, sessions, users, verifications } from "./tables";

const SECONDS_PER_DAY = 86_400;
const SESSION_DURATION_SECONDS = 7 * SECONDS_PER_DAY;
const SESSION_RENEWAL_SECONDS = SECONDS_PER_DAY;
const RATE_LIMIT_WINDOW_SECONDS = 60;
const AUTH_REQUESTS_PER_WINDOW = 60;
const SIGN_IN_ATTEMPTS_PER_WINDOW = 5;
const SIGN_IN_ENDPOINT_PATH = "/sign-in/email";
const SECONDS_PER_HOUR = 3_600;
const PASSWORD_RESET_ATTEMPTS_PER_HOUR = 5;
const PASSWORD_RESET_REQUEST_ENDPOINT_PATH = "/request-password-reset";
const PASSWORD_RESET_ENDPOINT_PATH = "/reset-password";
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
      },
    },
    advanced: {
      ipAddress: { ipAddressHeaders: [CLIENT_IP_HEADER] },
    },
    hooks: { after: recordFailedSignInMiddleware },
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
