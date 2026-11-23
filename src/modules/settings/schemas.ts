import { z } from "zod";

// El número del huésped se guarda como entero de PostgreSQL: el último más 1 tiene que entrar.
export const MAXIMUM_LAST_CLINICAL_RECORD_NUMBER = 2_147_483_646;

const DIGITS_ONLY_PATTERN = /^\d+$/;

export const lastClinicalRecordNumberInputSchema = z.object({
  lastClinicalRecordNumber: z
    .string()
    .trim()
    .min(1, { error: "Ingresá el último número asignado.", abort: true })
    .regex(DIGITS_ONLY_PATTERN, "Escribí solo números, sin puntos ni espacios.")
    .transform(Number)
    .pipe(
      z
        .number()
        .max(
          MAXIMUM_LAST_CLINICAL_RECORD_NUMBER,
          "El número no puede pasar de 2.147.483.646.",
        ),
    ),
});

export type LastClinicalRecordNumberInput = z.input<
  typeof lastClinicalRecordNumberInputSchema
>;

export const storedClinicalRecordNumberSchema = z.number().int().nonnegative();

export function describeMinimumNumber(lastAssignedNumber: number): string {
  return `El número no puede ser menor que ${lastAssignedNumber}, el último que ya se asignó.`;
}
