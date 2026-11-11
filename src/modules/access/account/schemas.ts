import { z } from "zod";

import {
  hasMatchingConfirmation,
  passwordMismatch,
  passwordSchema,
  personNameSchema,
} from "../schemas";

export const totpUriSchema = z.string().startsWith("otpauth://totp/", {
  error: "El enlace del autenticador no es válido.",
});

export const ownNameSchema = z.object({ name: personNameSchema });

export type OwnNameInput = z.input<typeof ownNameSchema>;

export const passwordChangeSchema = z
  .object({
    currentPassword: z
      .string()
      .min(1, { error: "Ingresá tu contraseña actual." }),
    password: passwordSchema,
    passwordConfirmation: z.string(),
  })
  .refine(hasMatchingConfirmation, passwordMismatch);
