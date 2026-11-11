import { z } from "zod";

export const PASSWORD_MIN_LENGTH = 12;

export const PASSWORD_MAX_LENGTH = 256;

export const passwordSchema = z
  .string()
  .min(PASSWORD_MIN_LENGTH, {
    error: `La contraseña debe tener al menos ${PASSWORD_MIN_LENGTH} caracteres.`,
  })
  .max(PASSWORD_MAX_LENGTH, {
    error: `La contraseña no puede superar los ${PASSWORD_MAX_LENGTH} caracteres.`,
  });

export function hasMatchingConfirmation(input: {
  password: string;
  passwordConfirmation: string;
}): boolean {
  return input.password === input.passwordConfirmation;
}

export const passwordMismatch = {
  error: "Las contraseñas no coinciden.",
  path: ["passwordConfirmation"],
};

export const emailSchema = z
  .email({ error: "El correo no es válido." })
  .transform((email) => email.toLowerCase());

const PERSON_NAME_MIN_LENGTH = 2;

const PERSON_NAME_MAX_LENGTH = 120;

export const personNameSchema = z
  .string()
  .trim()
  .min(PERSON_NAME_MIN_LENGTH, {
    error: `El nombre debe tener al menos ${PERSON_NAME_MIN_LENGTH} caracteres.`,
  })
  .max(PERSON_NAME_MAX_LENGTH, {
    error: `El nombre no puede superar los ${PERSON_NAME_MAX_LENGTH} caracteres.`,
  });
