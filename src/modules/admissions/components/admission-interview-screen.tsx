import { AlertCircleIcon, PencilEdit02Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";

import { DIALOG_BUTTON_CLASS_NAME } from "@/components/shared/form-styles";
import { LoadingStatus } from "@/components/shared/loading-status";
import { ADMISSIONS_DESTINATION } from "@/components/shared/navigation";
import { SectionSheet } from "@/components/shared/section-sheet";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { hasPermission, requirePermission } from "@/modules/access";
import { formatDateTime } from "@/platform/dates";

import { ADMISSIONS_PATH, buildEditAdmissionInterviewPath } from "../schemas";
import {
  type AdmissionInterviewView,
  findAdmissionInterview,
  loadInterviewFormOptions,
} from "../service";
import { AdmissionInterviewDetail } from "./admission-interview-detail";

const INTERVIEW_TITLE = "Entrevista de admisión";
const FORMER_USER_LABEL = "una persona que ya no tiene cuenta";

function describeAuthor(name: string | null): string {
  return name ?? FORMER_USER_LABEL;
}

function RecordHistory({ interview }: { interview: AdmissionInterviewView }) {
  const wasUpdated =
    interview.updatedAt.getTime() !== interview.createdAt.getTime();
  return (
    <p className="text-base text-muted-foreground">
      Cargada el {formatDateTime(interview.createdAt)} por{" "}
      {describeAuthor(interview.createdByName)}.
      {wasUpdated &&
        ` Última modificación el ${formatDateTime(interview.updatedAt)} por ${describeAuthor(interview.updatedByName)}.`}
    </p>
  );
}

async function AdmissionInterviewContent({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { access } = await requirePermission("admissions.interviews.view");
  const { id } = await params;
  const interview = await findAdmissionInterview(id);
  if (!interview) {
    notFound();
  }
  const { catalogFields, religionOtherOptionId } =
    await loadInterviewFormOptions(access, interview.details);
  const canEdit =
    !interview.isAnnulled &&
    hasPermission(access, "admissions.interviews.update");
  const { guestFirstName, guestLastName } = interview.details;

  return (
    <SectionSheet
      destination={ADMISSIONS_DESTINATION}
      title={`${guestFirstName} ${guestLastName}`}
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <RecordHistory interview={interview} />
        <div className="flex flex-col-reverse gap-2 sm:flex-row">
          <Button
            asChild
            variant="outline"
            className={DIALOG_BUTTON_CLASS_NAME}
          >
            <Link href={ADMISSIONS_PATH}>Volver a Admisiones</Link>
          </Button>
          {canEdit && (
            <Button asChild className={DIALOG_BUTTON_CLASS_NAME}>
              <Link href={buildEditAdmissionInterviewPath(interview.id)}>
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
      {interview.isAnnulled && (
        <Alert>
          <HugeiconsIcon icon={AlertCircleIcon} aria-hidden="true" />
          <AlertDescription className="text-base">
            Esta entrevista está anulada. Se puede consultar, pero ya no se
            puede modificar.
          </AlertDescription>
        </Alert>
      )}
      <AdmissionInterviewDetail
        interview={interview.details}
        catalogFields={catalogFields}
        religionOtherOptionId={religionOtherOptionId}
      />
    </SectionSheet>
  );
}

export function AdmissionInterviewScreen({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  return (
    <Suspense
      fallback={
        <SectionSheet
          destination={ADMISSIONS_DESTINATION}
          title={INTERVIEW_TITLE}
        >
          <LoadingStatus label="Cargando la entrevista…" />
        </SectionSheet>
      }
    >
      <AdmissionInterviewContent params={params} />
    </Suspense>
  );
}
