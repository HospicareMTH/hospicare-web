import { z } from "zod";

import { emailSchema, personNameSchema } from "@/modules/access";

import { HEALTHCARE_PROFESSIONAL_TEXT_MAX_LENGTH } from "./field-limits";

function optionalText(fieldLabel: string) {
  return z
    .string()
    .trim()
    .max(HEALTHCARE_PROFESSIONAL_TEXT_MAX_LENGTH, {
      error: `${fieldLabel} no puede superar los ${HEALTHCARE_PROFESSIONAL_TEXT_MAX_LENGTH} caracteres.`,
    })
    .transform((text) => text || null);
}

const optionalEmailSchema = z
  .string()
  .trim()
  .pipe(z.union([z.literal(""), emailSchema]))
  .transform((email) => email || null);

export const healthcareProfessionalIdSchema = z.uuid({
  error: "El profesional no es válido.",
});

export const healthcareProfessionalDetailsSchema = z.object({
  fullName: personNameSchema,
  specialty: optionalText("La especialidad"),
  licenseNumber: optionalText("La matrícula"),
  phone: optionalText("El teléfono"),
  email: optionalEmailSchema,
});

export type HealthcareProfessionalDetailsInput = z.input<
  typeof healthcareProfessionalDetailsSchema
>;

export type HealthcareProfessionalDetails = z.output<
  typeof healthcareProfessionalDetailsSchema
>;
