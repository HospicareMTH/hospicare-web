import { z } from "zod";

import {
  EDIT_WINDOW_MAXIMUM_AMOUNTS,
  EDIT_WINDOW_UNITS,
  type EditWindowUnit,
} from "./tables";

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

export const IMMEDIATE_LOCK_MODE = "immediate";
export const DURATION_MODE = "duration";

export type EditWindow =
  | { mode: typeof IMMEDIATE_LOCK_MODE }
  | { mode: typeof DURATION_MODE; amount: number; unit: EditWindowUnit };

export const storedEditWindowSchema = z.discriminatedUnion("mode", [
  z.object({ mode: z.literal(IMMEDIATE_LOCK_MODE) }),
  z.object({
    mode: z.literal(DURATION_MODE),
    amount: z.number().int().positive(),
    unit: z.enum(EDIT_WINDOW_UNITS),
  }),
]);

export const EDIT_WINDOW_UNIT_LABELS: Record<
  EditWindowUnit,
  { singular: string; plural: string }
> = {
  minutes: { singular: "minuto", plural: "minutos" },
  hours: { singular: "hora", plural: "horas" },
  days: { singular: "día", plural: "días" },
};

const POSITIVE_INTEGER_PATTERN = /^[1-9]\d*$/;

const AMOUNT_MESSAGE = "La cantidad debe ser un número entero mayor que 0.";
const MAXIMUM_WINDOW_MESSAGE = "La ventana no puede superar los 30 días.";

export const editWindowInputSchema = z
  .object({
    mode: z.enum([IMMEDIATE_LOCK_MODE, DURATION_MODE], {
      error: "Elegí cómo funciona la ventana.",
    }),
    amount: z.string().trim(),
    unit: z.enum(EDIT_WINDOW_UNITS, {
      error: "La unidad elegida no es válida. Actualizá la pantalla.",
    }),
  })
  .transform((input, context): EditWindow => {
    if (input.mode === IMMEDIATE_LOCK_MODE) {
      return { mode: IMMEDIATE_LOCK_MODE };
    }
    if (!POSITIVE_INTEGER_PATTERN.test(input.amount)) {
      context.addIssue({
        code: "custom",
        path: ["amount"],
        message: AMOUNT_MESSAGE,
      });
      return z.NEVER;
    }
    const amount = Number(input.amount);
    if (amount > EDIT_WINDOW_MAXIMUM_AMOUNTS[input.unit]) {
      context.addIssue({
        code: "custom",
        path: ["amount"],
        message: MAXIMUM_WINDOW_MESSAGE,
      });
      return z.NEVER;
    }
    return { mode: DURATION_MODE, amount, unit: input.unit };
  });

export type EditWindowInput = z.input<typeof editWindowInputSchema>;

export function describeEditWindow(window: EditWindow): string {
  if (window.mode === IMMEDIATE_LOCK_MODE) {
    return "Bloqueo inmediato";
  }
  const labels = EDIT_WINDOW_UNIT_LABELS[window.unit];
  return `${window.amount} ${window.amount === 1 ? labels.singular : labels.plural}`;
}

const MILLISECONDS_BY_UNIT: Record<EditWindowUnit, number> = {
  minutes: 60_000,
  hours: 3_600_000,
  days: 86_400_000,
};

// RF-CFG-03: el límite de edición de un documento nuevo.
export function computeEditableUntil(
  window: EditWindow,
  registeredAt: Date,
): Date {
  if (window.mode === IMMEDIATE_LOCK_MODE) {
    return registeredAt;
  }
  return new Date(
    registeredAt.getTime() + window.amount * MILLISECONDS_BY_UNIT[window.unit],
  );
}
