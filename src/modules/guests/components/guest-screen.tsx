import { AlertCircleIcon, PencilEdit02Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { type ReactNode, Suspense } from "react";

import { DIALOG_BUTTON_CLASS_NAME } from "@/components/shared/form-styles";
import { LoadingStatus } from "@/components/shared/loading-status";
import { GUESTS_DESTINATION } from "@/components/shared/navigation";
import { SectionSheet } from "@/components/shared/section-sheet";
import { describeRecordAuthor } from "@/components/shared/record-author";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { hasPermission, requirePermission } from "@/modules/access";
import { buildAdmissionInterviewPath } from "@/modules/admissions";
import { formatDateTime } from "@/platform/dates";
import type { SearchParams } from "@/platform/list-query";

import {
  buildEditGuestPath,
  DEFAULT_GUEST_TAB,
  GUESTS_PATH,
  parseGuestTab,
} from "../schemas";
import { findGuest, type GuestView } from "../service";
import { AnnulGuestButton } from "./annul-guest-button";
import { GuestDetail } from "./guest-detail";
import { type GuestTabPanel, GuestTabs } from "./guest-tabs";

const GUEST_TITLE = "Huésped";

export type GuestEvaluationsSlot = {
  id: string;
  fullName: string;
  isAnnulled: boolean;
};

type GuestScreenProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<SearchParams>;
  renderEvaluations: (guest: GuestEvaluationsSlot) => ReactNode;
};
function RecordHistory({ guest }: { guest: GuestView }) {
  const wasUpdated = guest.updatedAt.getTime() !== guest.createdAt.getTime();
  return (
    <p className="text-base text-muted-foreground">
      <span className="font-medium text-foreground tabular-nums">
        Historia clínica N.° {guest.clinicalRecordNumber}.
      </span>{" "}
      Cargado el {formatDateTime(guest.createdAt)} por{" "}
      {describeRecordAuthor(guest.createdByName)}.
      {wasUpdated &&
        ` Última modificación el ${formatDateTime(guest.updatedAt)} por ${describeRecordAuthor(guest.updatedByName)}.`}
    </p>
  );
}

async function GuestContent({
  params,
  searchParams,
  renderEvaluations,
}: GuestScreenProps) {
  const { access } = await requirePermission("guests.records.view");
  const { id } = await params;
  const requestedTab = parseGuestTab(await searchParams);
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
  const panels: GuestTabPanel[] = [
    {
      value: "internacion",
      label: "Internación",
      content: <GuestDetail guest={guest} interviewHref={interviewHref} />,
    },
  ];
  // RF-HUE-04: Evaluaciones aparece con el permiso de ver cualquiera de las dos.
  if (
    hasPermission(access, "guests.cam_evaluations.view") ||
    hasPermission(access, "guests.physical_evaluations.view")
  ) {
    panels.push({
      value: "evaluaciones",
      label: "Evaluaciones",
      content: renderEvaluations({
        id: guest.id,
        fullName: guest.fullName,
        isAnnulled: guest.annulment !== null,
      }),
    });
  }
  const initialTab = panels.some(({ value }) => value === requestedTab)
    ? requestedTab
    : DEFAULT_GUEST_TAB;

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
              {describeRecordAuthor(guest.annulment.annulledByName)}. Se puede
              consultar, pero ya no se puede modificar.
            </span>
            <span className="whitespace-pre-line">
              Motivo: {guest.annulment.reason}
            </span>
          </AlertDescription>
        </Alert>
      )}
      <GuestTabs initialTab={initialTab} panels={panels} />
    </SectionSheet>
  );
}

export function GuestScreen(props: GuestScreenProps) {
  return (
    <Suspense
      fallback={
        <SectionSheet destination={GUESTS_DESTINATION} title={GUEST_TITLE}>
          <LoadingStatus label="Cargando el huésped…" />
        </SectionSheet>
      }
    >
      <GuestContent {...props} />
    </Suspense>
  );
}
