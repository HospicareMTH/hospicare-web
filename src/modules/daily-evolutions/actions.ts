"use server";

import { requirePermission } from "@/modules/access";
import { GUEST_REJECTION_MESSAGES, guestIdSchema } from "@/modules/guests";
import {
  type ActionResult,
  refreshOnSuccess,
  reject,
  toInvalidResult,
} from "@/platform/operation-result";

import { type DailyEvolutionInput, dailyEvolutionSchema } from "./schemas";
import { registerDailyEvolution } from "./service";

export async function registerDailyEvolutionAction(
  guestId: string,
  input: DailyEvolutionInput,
): Promise<ActionResult> {
  const { access } = await requirePermission("guests.daily_evolutions.create");
  const parsedGuestId = guestIdSchema.safeParse(guestId);
  if (!parsedGuestId.success) {
    return reject(GUEST_REJECTION_MESSAGES.notFound);
  }
  const parsedEvolution = dailyEvolutionSchema.safeParse(input);
  if (!parsedEvolution.success) {
    return toInvalidResult(parsedEvolution.error);
  }
  return refreshOnSuccess(
    await registerDailyEvolution(
      access.userId,
      parsedGuestId.data,
      parsedEvolution.data.text,
    ),
  );
}
