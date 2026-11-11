import { z } from "zod";

import {
  hasMatchingConfirmation,
  passwordMismatch,
  passwordSchema,
} from "../schemas";

export const ACCESS_REVOKED_ERROR_CODE = "ACCESS_REVOKED";

export const EMAIL_NOT_VERIFIED_ERROR_CODE = "EMAIL_NOT_VERIFIED";

export const signInRequestBodySchema = z.object({ email: z.string() });

export const newPasswordSchema = z
  .object({
    token: z.string().min(1, { error: "El enlace no es válido." }),
    password: passwordSchema,
    passwordConfirmation: z.string(),
  })
  .refine(hasMatchingConfirmation, passwordMismatch);

export type NewPasswordInput = z.input<typeof newPasswordSchema>;
