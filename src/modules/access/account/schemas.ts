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

const MAX_HIDDEN_COLUMNS = 50;

export const columnPreferenceSchema = z.object({
  tableKey: z
    .string()
    .regex(/^[a-z][a-z-]{0,63}$/, { error: "La tabla no es válida." }),
  hiddenColumns: z
    .array(
      z.string().regex(/^[a-zA-Z][a-zA-Z0-9]{0,63}$/, {
        error: "Las columnas no son válidas.",
      }),
    )
    .max(MAX_HIDDEN_COLUMNS, { error: "Las columnas no son válidas." })
    .transform((columns) => [...new Set(columns)]),
});

export type ColumnPreference = z.output<typeof columnPreferenceSchema>;
