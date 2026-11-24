import { z } from "zod";

import { requiredTextSchema } from "@/platform/field-validation";

import { DAILY_EVOLUTION_TEXT_LIMITS } from "./tables";

export const dailyEvolutionSchema = z.object({
  text: requiredTextSchema("La evolución", DAILY_EVOLUTION_TEXT_LIMITS),
});

export type DailyEvolutionInput = z.input<typeof dailyEvolutionSchema>;
