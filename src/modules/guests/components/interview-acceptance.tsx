import { CheckmarkCircle02Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import Link from "next/link";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { getCurrentUser, hasPermission } from "@/modules/access";
import type { InterviewAcceptanceSlot } from "@/modules/admissions";
import { formatDateTime } from "@/platform/dates";

import { buildGuestPath } from "../schemas";
import { findGuestOfInterview, isDniInActiveGuest } from "../service";
import { AcceptInterviewButton } from "./accept-interview-button";

export async function InterviewAcceptance({
  interviewId,
  isAnnulled,
  guestFullName,
  guestDni,
}: InterviewAcceptanceSlot) {
  const { access } = await getCurrentUser();
  const guest = await findGuestOfInterview(interviewId);

  if (guest) {
    const canSeeGuest = hasPermission(access, "guests.records.view");
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
                className="font-medium text-primary underline underline-offset-4"
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

  return (
    <div className="flex flex-col gap-3 rounded-lg border p-4 sm:flex-row sm:items-center sm:justify-between">
      <p className="text-base">
        Esta entrevista todavía no se aceptó. Al aceptarla se crea el huésped.
      </p>
      <AcceptInterviewButton
        interviewId={interviewId}
        guestFullName={guestFullName}
        hasActiveGuestWithSameDni={await isDniInActiveGuest(guestDni)}
      />
    </div>
  );
}
