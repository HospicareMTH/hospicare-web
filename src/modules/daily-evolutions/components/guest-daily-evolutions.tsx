import { describeRecordAuthor } from "@/components/shared/record-author";
import {
  getCurrentUser,
  hasPermission,
  type UserAccess,
} from "@/modules/access";
import type { GuestTabSlot } from "@/modules/guests";
import { formatDateTime } from "@/platform/dates";

import {
  type DailyEvolutionView,
  isWithinEditWindow,
  listDailyEvolutions,
  resolveSignature,
} from "../service";
import { DailyEvolutionComposer } from "./daily-evolution-composer";
import {
  DailyEvolutionEntry,
  type DailyEvolutionEntryData,
} from "./daily-evolution-entry";

function toEntryData(
  evolution: DailyEvolutionView,
  access: UserAccess,
  isGuestAnnulled: boolean,
  clarificationSignature: string | null,
  now: Date,
): DailyEvolutionEntryData {
  const isWithinWindow = isWithinEditWindow(evolution, now);
  const isAuthor = evolution.authorUserId === access.userId;
  const canChange = !isGuestAnnulled && isAuthor && isWithinWindow;
  const wasModified =
    evolution.updatedAt.getTime() !== evolution.registeredAt.getTime();
  return {
    id: evolution.id,
    version: evolution.version,
    text: evolution.text,
    timeLabel: formatDateTime(evolution.registeredAt),
    timeIso: evolution.registeredAt.toISOString(),
    authorLabel: describeRecordAuthor(evolution.authorName),
    signature: evolution.signature,
    isLocked: !isWithinWindow,
    editableUntilLabel: canChange
      ? formatDateTime(evolution.editableUntil)
      : null,
    modifiedAtLabel: wasModified ? formatDateTime(evolution.updatedAt) : null,
    clarifications: evolution.clarifications.map((clarification) => ({
      id: clarification.id,
      text: clarification.text,
      timeLabel: formatDateTime(clarification.createdAt),
      timeIso: clarification.createdAt.toISOString(),
      authorLabel: describeRecordAuthor(clarification.authorName),
      signature: clarification.signature,
    })),
    canEdit:
      canChange && hasPermission(access, "guests.daily_evolutions.update"),
    canAnnul:
      canChange && hasPermission(access, "guests.daily_evolutions.annul"),
    clarificationSignature,
  };
}

export async function GuestDailyEvolutions({ guest }: { guest: GuestTabSlot }) {
  const { access } = await getCurrentUser();
  if (!hasPermission(access, "guests.daily_evolutions.view")) {
    return null;
  }
  const canWrite =
    !guest.isAnnulled &&
    hasPermission(access, "guests.daily_evolutions.create");
  const [evolutions, signature] = await Promise.all([
    listDailyEvolutions(guest.id),
    canWrite ? resolveSignature(access.userId) : null,
  ]);
  const now = new Date();

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
            <DailyEvolutionEntry
              key={`${evolution.id}-${evolution.version}-${evolution.clarifications.length}`}
              evolution={toEntryData(
                evolution,
                access,
                guest.isAnnulled,
                signature,
                now,
              )}
            />
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
