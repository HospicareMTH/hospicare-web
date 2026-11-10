import { z } from "zod";

export const PASSWORD_MIN_LENGTH = 12;
export const PASSWORD_MAX_LENGTH = 256;
const NAME_MIN_LENGTH = 2;

export const superUserInputSchema = z.object({
  name: z
    .string()
    .trim()
    .min(NAME_MIN_LENGTH, {
      error: `El nombre debe tener al menos ${NAME_MIN_LENGTH} caracteres.`,
    }),
  email: z
    .email({ error: "El correo no es válido." })
    .transform((email) => email.toLowerCase()),
  password: z
    .string()
    .min(PASSWORD_MIN_LENGTH, {
      error: `La contraseña debe tener al menos ${PASSWORD_MIN_LENGTH} caracteres.`,
    })
    .max(PASSWORD_MAX_LENGTH, {
      error: `La contraseña no puede superar los ${PASSWORD_MAX_LENGTH} caracteres.`,
    }),
});

export type SuperUserInput = z.input<typeof superUserInputSchema>;

export const signInRequestBodySchema = z.object({ email: z.string() });
