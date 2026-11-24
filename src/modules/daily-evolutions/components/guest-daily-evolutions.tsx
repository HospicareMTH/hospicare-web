import { describeRecordAuthor } from "@/components/shared/record-author";
import { getCurrentUser, hasPermission } from "@/modules/access";
import type { GuestTabSlot } from "@/modules/guests";
import { formatDateTime } from "@/platform/dates";

import {
  type DailyEvolutionView,
  listDailyEvolutions,
  resolveSignature,
} from "../service";
import { DailyEvolutionComposer } from "./daily-evolution-composer";

function DailyEvolutionItem({ evolution }: { evolution: DailyEvolutionView }) {
  return (
    <li className="flex flex-col gap-2 border-t py-4 first:border-t-0">
      <p className="text-sm text-muted-foreground">
        <time
          dateTime={evolution.registeredAt.toISOString()}
          className="font-medium text-foreground tabular-nums"
        >
          {formatDateTime(evolution.registeredAt)}
        </time>{" "}
        · {describeRecordAuthor(evolution.authorName)} · {evolution.signature}
      </p>
      <p className="max-w-prose text-base whitespace-pre-line">
        {evolution.text}
      </p>
    </li>
  );
}

export async function GuestDailyEvolutions({ guest }: { guest: GuestTabSlot }) {
  const { access } = await getCurrentUser();
  if (!hasPermission(access, "guests.daily_evolutions.view")) {
    return null;
  }
  const canRegister =
    !guest.isAnnulled &&
    hasPermission(access, "guests.daily_evolutions.create");
  const [evolutions, signature] = await Promise.all([
    listDailyEvolutions(guest.id),
    canRegister ? resolveSignature(access.userId) : null,
  ]);

  return (
    <div className="flex flex-col gap-6">
      {signature !== null && (
        <div className="border-b pb-6">
          <DailyEvolutionComposer guestId={guest.id} signature={signature} />
        </div>
      )}
      {evolutions.length > 0 ? (
        <ol className="flex flex-col">
          {evolutions.map((evolution) => (
            <DailyEvolutionItem key={evolution.id} evolution={evolution} />
          ))}
        </ol>
      ) : (
        <p className="text-base text-muted-foreground">
          Todavía no hay evoluciones registradas.
        </p>
      )}
    </div>
  );
}
