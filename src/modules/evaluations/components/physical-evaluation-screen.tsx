import { AlertCircleIcon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { type ReactNode, Suspense } from "react";

import { DIALOG_BUTTON_CLASS_NAME } from "@/components/shared/form-styles";
import { LoadingStatus } from "@/components/shared/loading-status";
import { GUESTS_DESTINATION } from "@/components/shared/navigation";
import { SectionSheet } from "@/components/shared/section-sheet";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  hasPermission,
  requirePermission,
  type UserAccess,
} from "@/modules/access";
import {
  buildGuestEvaluationsPath,
  findGuestSummary,
  GUEST_REJECTION_MESSAGES,
  type GuestSummary,
} from "@/modules/guests";
import { getBusinessDate } from "@/platform/dates";

import { buildEmptyPhysicalEvaluation } from "../schemas";
import {
  findPhysicalEvaluationOfGuest,
  loadPhysicalEvaluationCatalogs,
  type PhysicalEvaluationView,
} from "../service";
import { EvaluationHistory } from "./evaluation-history";
import { PhysicalEvaluationDetail } from "./physical-evaluation-detail";
import {
  PhysicalEvaluationForm,
  type PhysicalEvaluationFormMode,
} from "./physical-evaluation-form";

const SCREEN_TITLE = "Evaluación física de ingreso";

function GuestIdentity({ guest }: { guest: GuestSummary }) {
  return (
    <p className="text-base text-muted-foreground">
      {guest.fullName} ·{" "}
      <span className="tabular-nums">
        Historia clínica N.° {guest.clinicalRecordNumber}
      </span>
    </p>
  );
}

function ReturnButton({ href }: { href: string }) {
  return (
    <div>
      <Button asChild variant="outline" className={DIALOG_BUTTON_CLASS_NAME}>
        <Link href={href}>Ver el huésped</Link>
      </Button>
    </div>
  );
}

function findFormMode(
  access: UserAccess,
  guest: GuestSummary,
  evaluation: PhysicalEvaluationView | null,
): PhysicalEvaluationFormMode | null {
  if (guest.isAnnulled) {
    return null;
  }
  if (!evaluation) {
    return hasPermission(access, "guests.physical_evaluations.create")
      ? { kind: "create" }
      : null;
  }
  return hasPermission(access, "guests.physical_evaluations.update")
    ? { kind: "update", version: evaluation.version }
    : null;
}

function ReadOnlyContent({
  guest,
  evaluation,
  returnHref,
}: {
  guest: GuestSummary;
  evaluation: PhysicalEvaluationView | null;
  returnHref: string;
}) {
  return (
    <>
      {guest.isAnnulled && (
        <Alert>
          <HugeiconsIcon icon={AlertCircleIcon} aria-hidden="true" />
          <AlertDescription className="text-base">
            {GUEST_REJECTION_MESSAGES.annulled}
          </AlertDescription>
        </Alert>
      )}
      {evaluation ? (
        <>
          <EvaluationHistory {...evaluation} />
          <PhysicalEvaluationDetail evaluation={evaluation} />
        </>
      ) : (
        <p className="text-base text-muted-foreground">
          Todavía no se cargó la evaluación física de ingreso.
        </p>
      )}
      <ReturnButton href={returnHref} />
    </>
  );
}

async function PhysicalEvaluationContent({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { access } = await requirePermission(
    "guests.physical_evaluations.view",
  );
  const { id } = await params;
  const guest = await findGuestSummary(id);
  if (!guest) {
    notFound();
  }
  const evaluation = await findPhysicalEvaluationOfGuest(guest.id);
  const returnHref = buildGuestEvaluationsPath(guest.id);
  const mode = findFormMode(access, guest, evaluation);
  let content: ReactNode;
  if (mode) {
    const today = getBusinessDate(new Date());
    content = (
      <>
        {evaluation && <EvaluationHistory {...evaluation} />}
        <PhysicalEvaluationForm
          guestId={guest.id}
          mode={mode}
          initialEvaluation={
            evaluation?.input ?? buildEmptyPhysicalEvaluation(today)
          }
          catalogs={await loadPhysicalEvaluationCatalogs(
            access,
            evaluation?.savedSelections ?? null,
          )}
          today={today}
          returnHref={returnHref}
        />
      </>
    );
  } else {
    content = (
      <ReadOnlyContent
        guest={guest}
        evaluation={evaluation}
        returnHref={returnHref}
      />
    );
  }

  return (
    <SectionSheet destination={GUESTS_DESTINATION} title={SCREEN_TITLE}>
      <GuestIdentity guest={guest} />
      {content}
    </SectionSheet>
  );
}

export function PhysicalEvaluationScreen({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  return (
    <Suspense
      fallback={
        <SectionSheet destination={GUESTS_DESTINATION} title={SCREEN_TITLE}>
          <LoadingStatus label="Cargando la evaluación física de ingreso…" />
        </SectionSheet>
      }
    >
      <PhysicalEvaluationContent params={params} />
    </Suspense>
  );
}
