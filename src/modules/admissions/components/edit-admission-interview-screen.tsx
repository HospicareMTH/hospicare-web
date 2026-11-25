import { AlertCircleIcon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { type ReactNode, Suspense } from "react";

import { DIALOG_BUTTON_CLASS_NAME } from "@/components/shared/form-styles";
import { LoadingStatus } from "@/components/shared/loading-status";
import { ADMISSIONS_DESTINATION } from "@/components/shared/navigation";
import { SectionSheet } from "@/components/shared/section-sheet";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { requirePermission } from "@/modules/access";
import { getBusinessDate } from "@/platform/dates";

import { buildAdmissionInterviewPath } from "../schemas";
import {
  ADMISSION_INTERVIEW_REJECTION_MESSAGES,
  findAdmissionInterview,
  loadInterviewFormOptions,
} from "../service";
import { AdmissionInterviewForm } from "./admission-interview-form";

const EDIT_TITLE = "Editar entrevista";

type EditAdmissionInterviewScreenProps = {
  params: Promise<{ id: string }>;
  renderEditNotice: (interviewId: string) => ReactNode;
};

async function EditAdmissionInterviewContent({
  params,
  renderEditNotice,
}: EditAdmissionInterviewScreenProps) {
  const { access } = await requirePermission("admissions.interviews.update");
  const { id } = await params;
  const interview = await findAdmissionInterview(id);
  if (!interview) {
    notFound();
  }
  if (interview.isAnnulled) {
    return (
      <SectionSheet destination={ADMISSIONS_DESTINATION} title={EDIT_TITLE}>
        <Alert>
          <HugeiconsIcon icon={AlertCircleIcon} aria-hidden="true" />
          <AlertDescription className="text-base">
            {ADMISSION_INTERVIEW_REJECTION_MESSAGES.annulled}
          </AlertDescription>
        </Alert>
        <div>
          <Button
            asChild
            variant="outline"
            className={DIALOG_BUTTON_CLASS_NAME}
          >
            <Link href={buildAdmissionInterviewPath(interview.id)}>
              Ver la entrevista
            </Link>
          </Button>
        </div>
      </SectionSheet>
    );
  }
  const { catalogFields, religionOtherOptionId } =
    await loadInterviewFormOptions(access, interview.details);

  return (
    <SectionSheet destination={ADMISSIONS_DESTINATION} title={EDIT_TITLE}>
      {renderEditNotice(interview.id)}
      <AdmissionInterviewForm
        mode={{
          kind: "edit",
          interviewId: interview.id,
          version: interview.version,
        }}
        initialInterview={interview.details}
        catalogFields={catalogFields}
        religionOtherOptionId={religionOtherOptionId}
        today={getBusinessDate(new Date())}
      />
    </SectionSheet>
  );
}

export function EditAdmissionInterviewScreen({
  params,
  renderEditNotice,
}: EditAdmissionInterviewScreenProps) {
  return (
    <Suspense
      fallback={
        <SectionSheet destination={ADMISSIONS_DESTINATION} title={EDIT_TITLE}>
          <LoadingStatus label="Cargando la entrevista…" />
        </SectionSheet>
      }
    >
      <EditAdmissionInterviewContent
        params={params}
        renderEditNotice={renderEditNotice}
      />
    </Suspense>
  );
}
