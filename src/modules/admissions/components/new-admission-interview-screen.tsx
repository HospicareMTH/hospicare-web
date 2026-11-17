import { Suspense } from "react";

import { LoadingStatus } from "@/components/shared/loading-status";
import { requirePermission } from "@/modules/access";
import { getBusinessDate } from "@/platform/dates";

import { buildEmptyInterview } from "../schemas";
import { loadInterviewFormOptions } from "../service";
import { AdmissionInterviewForm } from "./admission-interview-form";

async function NewAdmissionInterviewContent() {
  const { access } = await requirePermission("admissions.interviews.create");
  const { catalogFields, religionOtherOptionId } =
    await loadInterviewFormOptions(access, null);
  const today = getBusinessDate(new Date());

  return (
    <AdmissionInterviewForm
      mode={{ kind: "create" }}
      initialInterview={buildEmptyInterview(today)}
      catalogFields={catalogFields}
      religionOtherOptionId={religionOtherOptionId}
      today={today}
    />
  );
}

export function NewAdmissionInterviewScreen() {
  return (
    <Suspense fallback={<LoadingStatus label="Cargando el formulario…" />}>
      <NewAdmissionInterviewContent />
    </Suspense>
  );
}
