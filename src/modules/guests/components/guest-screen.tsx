import { AlertCircleIcon, PencilEdit02Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";

import { DIALOG_BUTTON_CLASS_NAME } from "@/components/shared/form-styles";
import { LoadingStatus } from "@/components/shared/loading-status";
import { GUESTS_DESTINATION } from "@/components/shared/navigation";
import { SectionSheet } from "@/components/shared/section-sheet";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { hasPermission, requirePermission } from "@/modules/access";
import { buildAdmissionInterviewPath } from "@/modules/admissions";
import { formatDateTime } from "@/platform/dates";

import { buildEditGuestPath, GUESTS_PATH } from "../schemas";
import { findGuest, type GuestView } from "../service";
import { AnnulGuestButton } from "./annul-guest-button";
import { GuestDetail } from "./guest-detail";

const GUEST_TITLE = "Huésped";
const FORMER_USER_LABEL = "una persona que ya no tiene cuenta";

function describeAuthor(name: string | null): string {
  return name ?? FORMER_USER_LABEL;
}

function RecordHistory({ guest }: { guest: GuestView }) {
  const wasUpdated = guest.updatedAt.getTime() !== guest.createdAt.getTime();
  return (
    <p className="text-base text-muted-foreground">
      <span className="font-medium text-foreground tabular-nums">
        Historia clínica N.° {guest.clinicalRecordNumber}.
      </span>{" "}
      Cargado el {formatDateTime(guest.createdAt)} por{" "}
      {describeAuthor(guest.createdByName)}.
      {wasUpdated &&
        ` Última modificación el ${formatDateTime(guest.updatedAt)} por ${describeAuthor(guest.updatedByName)}.`}
    </p>
  );
}

async function GuestContent({ params }: { params: Promise<{ id: string }> }) {
  const { access } = await requirePermission("guests.records.view");
  const { id } = await params;
  const guest = await findGuest(id);
  if (!guest) {
    notFound();
  }
  const interviewHref =
    guest.admissionInterviewId &&
    hasPermission(access, "admissions.interviews.view")
      ? buildAdmissionInterviewPath(guest.admissionInterviewId)
      : null;
  const canEdit =
    !guest.annulment && hasPermission(access, "guests.records.update");
  const canAnnul =
    !guest.annulment && hasPermission(access, "guests.records.annul");

  return (
    <SectionSheet destination={GUESTS_DESTINATION} title={guest.fullName}>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <RecordHistory guest={guest} />
        <div className="flex flex-col-reverse gap-2 sm:flex-row">
          <Button
            asChild
            variant="outline"
            className={DIALOG_BUTTON_CLASS_NAME}
          >
            <Link href={GUESTS_PATH}>Volver a Huéspedes</Link>
          </Button>
          {canAnnul && (
            <AnnulGuestButton
              guest={{
                id: guest.id,
                fullName: guest.fullName,
                clinicalRecordNumber: guest.clinicalRecordNumber,
                origin: guest.origin,
              }}
            />
          )}
          {canEdit && (
            <Button asChild className={DIALOG_BUTTON_CLASS_NAME}>
              <Link href={buildEditGuestPath(guest.id)}>
                <HugeiconsIcon
                  icon={PencilEdit02Icon}
                  data-icon="inline-start"
                  aria-hidden="true"
                />
                Editar
              </Link>
            </Button>
          )}
        </div>
      </div>
      {guest.annulment && (
        <Alert>
          <HugeiconsIcon icon={AlertCircleIcon} aria-hidden="true" />
          <AlertDescription className="flex flex-col gap-1 text-base">
            <span>
              Anulado el {formatDateTime(guest.annulment.annulledAt)} por{" "}
              {describeAuthor(guest.annulment.annulledByName)}. Se puede
              consultar, pero ya no se puede modificar.
            </span>
            <span className="whitespace-pre-line">
              Motivo: {guest.annulment.reason}
            </span>
          </AlertDescription>
        </Alert>
      )}
      <GuestDetail guest={guest} interviewHref={interviewHref} />
    </SectionSheet>
  );
}

export function GuestScreen({ params }: { params: Promise<{ id: string }> }) {
  return (
    <Suspense
      fallback={
        <SectionSheet destination={GUESTS_DESTINATION} title={GUEST_TITLE}>
          <LoadingStatus label="Cargando el huésped…" />
        </SectionSheet>
      }
    >
      <GuestContent params={params} />
    </Suspense>
  );
}
