"use server";

import { z } from "zod";

import { requirePermission } from "@/modules/access";
import { GUEST_REJECTION_MESSAGES, guestIdSchema } from "@/modules/guests";
import {
  annulmentSchema,
  type AnnulmentInput,
} from "@/platform/field-validation";
import {
  type ActionResult,
  refreshOnSuccess,
  reject,
  toInvalidResult,
  toRejectedResult,
} from "@/platform/operation-result";

import {
  type ClarificationInput,
  clarificationSchema,
  dailyEvolutionIdSchema,
  type DailyEvolutionInput,
  dailyEvolutionSchema,
} from "./schemas";
import {
  addClarification,
  annulDailyEvolution,
  DAILY_EVOLUTION_REJECTION_MESSAGES,
  registerDailyEvolution,
  updateDailyEvolution,
} from "./service";

const versionSchema = z.iso.datetime({
  error: DAILY_EVOLUTION_REJECTION_MESSAGES.notAvailable,
});

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

export async function updateDailyEvolutionAction(
  evolutionId: string,
  version: string,
  input: DailyEvolutionInput,
): Promise<ActionResult> {
  const { access } = await requirePermission("guests.daily_evolutions.update");
  const parsedEvolutionId = dailyEvolutionIdSchema.safeParse(evolutionId);
  if (!parsedEvolutionId.success) {
    return reject(DAILY_EVOLUTION_REJECTION_MESSAGES.notAvailable);
  }
  const parsedVersion = versionSchema.safeParse(version);
  if (!parsedVersion.success) {
    return toRejectedResult(parsedVersion.error);
  }
  const parsedEvolution = dailyEvolutionSchema.safeParse(input);
  if (!parsedEvolution.success) {
    return toInvalidResult(parsedEvolution.error);
  }
  return refreshOnSuccess(
    await updateDailyEvolution(
      access.userId,
      parsedEvolutionId.data,
      parsedVersion.data,
      parsedEvolution.data.text,
    ),
  );
}

export async function annulDailyEvolutionAction(
  evolutionId: string,
  input: AnnulmentInput,
): Promise<ActionResult> {
  const { access } = await requirePermission("guests.daily_evolutions.annul");
  const parsedEvolutionId = dailyEvolutionIdSchema.safeParse(evolutionId);
  if (!parsedEvolutionId.success) {
    return reject(DAILY_EVOLUTION_REJECTION_MESSAGES.notAvailable);
  }
  const parsedAnnulment = annulmentSchema.safeParse(input);
  if (!parsedAnnulment.success) {
    return toInvalidResult(parsedAnnulment.error);
  }
  return refreshOnSuccess(
    await annulDailyEvolution(
      access.userId,
      parsedEvolutionId.data,
      parsedAnnulment.data.reason,
    ),
  );
}

export async function addClarificationAction(
  evolutionId: string,
  input: ClarificationInput,
): Promise<ActionResult> {
  const { access } = await requirePermission("guests.daily_evolutions.create");
  const parsedEvolutionId = dailyEvolutionIdSchema.safeParse(evolutionId);
  if (!parsedEvolutionId.success) {
    return reject(DAILY_EVOLUTION_REJECTION_MESSAGES.notAvailable);
  }
  const parsedClarification = clarificationSchema.safeParse(input);
  if (!parsedClarification.success) {
    return toInvalidResult(parsedClarification.error);
  }
  return refreshOnSuccess(
    await addClarification(
      access.userId,
      parsedEvolutionId.data,
      parsedClarification.data.text,
    ),
  );
}
