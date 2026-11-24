import { z } from "zod";

import { isAfterBusinessToday } from "./dates";
import { removeDniSeparators } from "./dni";

const DNI_MINIMUM = 1_000_000;
const DNI_MAXIMUM = 99_999_999;
const DIGITS_ONLY = /^\d+$/;

const DNI_ERROR =
  "El DNI debe tener 7 u 8 números, entre 1.000.000 y 99.999.999.";

function isDniInRange(digits: string): boolean {
  const value = Number(digits);
  return value >= DNI_MINIMUM && value <= DNI_MAXIMUM;
}

export const dniSchema = z
  .string()
  .transform(removeDniSeparators)
  .refine((digits) => DIGITS_ONLY.test(digits) && isDniInRange(digits), {
    error: DNI_ERROR,
  })
  .transform((digits) => String(Number(digits)));

export function pastOrTodayDateSchema(fieldLabel: string) {
  return z
    .string()
    .min(1, { error: `Escribí ${fieldLabel.toLowerCase()}.` })
    .pipe(z.iso.date({ error: `${fieldLabel} no es válida.` }))
    .refine((isoDate) => !isAfterBusinessToday(isoDate), {
      error: `${fieldLabel} no puede ser posterior a hoy.`,
    });
}

type TextLengthLimits = {
  minLength: number;
  maxLength: number;
};

export const PERSON_NAME_LIMITS: TextLengthLimits = {
  minLength: 2,
  maxLength: 80,
};
export const ADDRESS_LIMITS: TextLengthLimits = {
  minLength: 3,
  maxLength: 200,
};
export const HEALTH_INSURANCE_MEMBER_NUMBER_MAX_LENGTH = 40;

export function requiredTextSchema(
  fieldLabel: string,
  { minLength, maxLength }: TextLengthLimits,
) {
  return z
    .string()
    .trim()
    .min(minLength, {
      error: `${fieldLabel} debe tener al menos ${minLength} caracteres.`,
    })
    .max(maxLength, {
      error: `${fieldLabel} no puede superar los ${maxLength} caracteres.`,
    });
}

export function optionalTextSchema(fieldLabel: string, maxLength: number) {
  return z
    .string()
    .trim()
    .max(maxLength, {
      error: `${fieldLabel} no puede superar los ${maxLength} caracteres.`,
    })
    .transform((text) => text || null);
}
