"use client";

import { registerDailyEvolutionAction } from "../actions";
import { EvolutionTextForm } from "./evolution-text-form";

export function DailyEvolutionComposer({
  guestId,
  signature,
}: {
  guestId: string;
  signature: string;
}) {
  return (
    <EvolutionTextForm
      label="Nueva evolución"
      signature={signature}
      submitLabel="Registrar evolución"
      pendingLabel="Registrando…"
      successMessage="Evolución registrada."
      save={(input) => registerDailyEvolutionAction(guestId, input)}
    />
  );
}
