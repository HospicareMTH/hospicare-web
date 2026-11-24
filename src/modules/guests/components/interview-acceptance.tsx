import { CheckmarkCircle02Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import Link from "next/link";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { getCurrentUser, hasPermission } from "@/modules/access";
import type { InterviewAcceptanceSlot } from "@/modules/admissions";
import { formatDateTime } from "@/platform/dates";

import { buildGuestPath } from "../schemas";
import {
  type AnnulledInterviewGuest,
  findAnnulledGuestOfInterview,
  findGuestOfInterview,
  isDniInActiveGuest,
} from "../service";
import { AcceptInterviewButton } from "./accept-interview-button";

const GUEST_LINK_CLASS_NAME =
  "font-medium text-primary underline underline-offset-4";

function AnnulledGuestNotice({
  annulledGuest,
  canSeeGuest,
}: {
  annulledGuest: AnnulledInterviewGuest;
  canSeeGuest: boolean;
}) {
  const guestLabel = `historia clínica N.° ${annulledGuest.clinicalRecordNumber}`;
  return (
    <p className="text-base">
      La aceptaron el {formatDateTime(annulledGuest.acceptedAt)}, pero ese
      huésped (
      {canSeeGuest ? (
        <Link
          href={buildGuestPath(annulledGuest.guestId)}
          className={GUEST_LINK_CLASS_NAME}
        >
          {guestLabel}
        </Link>
      ) : (
        guestLabel
      )}
      ) se anuló el {formatDateTime(annulledGuest.annulledAt)}. Si la aceptás de
      nuevo, se crea otro huésped con otro número.
    </p>
  );
}

export async function InterviewAcceptance({
  interviewId,
  isAnnulled,
  guestFullName,
  guestDni,
}: InterviewAcceptanceSlot) {
  const { access } = await getCurrentUser();
  const guest = await findGuestOfInterview(interviewId);
  const canSeeGuest = hasPermission(access, "guests.records.view");

  if (guest) {
    return (
      <Alert>
        <HugeiconsIcon icon={CheckmarkCircle02Icon} aria-hidden="true" />
        <AlertDescription className="text-base">
          Aceptada el {formatDateTime(guest.acceptedAt)}
          {canSeeGuest ? (
            <>
              :{" "}
              <Link
                href={buildGuestPath(guest.guestId)}
                className={GUEST_LINK_CLASS_NAME}
              >
                huésped con historia clínica N.° {guest.clinicalRecordNumber}
              </Link>
              .
            </>
          ) : (
            "."
          )}
        </AlertDescription>
      </Alert>
    );
  }
  if (isAnnulled || !hasPermission(access, "guests.records.create")) {
    return null;
  }
  const annulledGuest = await findAnnulledGuestOfInterview(interviewId);

  return (
    <div className="flex flex-col gap-3 rounded-lg border p-4 sm:flex-row sm:items-center sm:justify-between">
      {annulledGuest ? (
        <AnnulledGuestNotice
          annulledGuest={annulledGuest}
          canSeeGuest={canSeeGuest}
        />
      ) : (
        <p className="text-base">
          Esta entrevista todavía no se aceptó. Al aceptarla se crea el huésped.
        </p>
      )}
      <AcceptInterviewButton
        interviewId={interviewId}
        guestFullName={guestFullName}
        hasActiveGuestWithSameDni={await isDniInActiveGuest(guestDni)}
      />
    </div>
  );
}
