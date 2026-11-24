import { DetailList } from "@/components/shared/detail-list";
import { getCurrentUser, hasPermission } from "@/modules/access";
import type { GuestEvaluationsSlot } from "@/modules/guests";
import { formatIsoDate, getBusinessDate } from "@/platform/dates";

import {
  buildEmptyCamEvaluation,
  CAM_CRITERIA,
  describeCamResult,
  NOT_EVALUATED_LABEL,
} from "../schemas";
import { type CamEvaluationView, findCamEvaluationOfGuest } from "../service";
import { CamEvaluationButton } from "./cam-evaluation-button";
import { EvaluationHistory } from "./evaluation-history";
import { PhysicalEvaluationSection } from "./physical-evaluation-section";

const CAM_SECTION_TITLE_ID = "cam-evaluation-title";

function describeAnswer(answer: boolean | null): string {
  if (answer === null) {
    return NOT_EVALUATED_LABEL;
  }
  return answer ? "Sí" : "No";
}

function CamEvaluationDetail({
  evaluation,
}: {
  evaluation: CamEvaluationView;
}) {
  return (
    <DetailList
      items={[
        {
          label: "Resultado",
          value: (
            <span className="font-semibold">
              {describeCamResult(evaluation.isDeliriumLikely)}
            </span>
          ),
        },
        {
          label: "Fecha de la evaluación",
          value: formatIsoDate(evaluation.input.evaluationDate),
        },
        ...CAM_CRITERIA.map(({ key, label }) => ({
          label,
          value: describeAnswer(evaluation.input[key]),
        })),
        {
          label: "Observaciones",
          value: evaluation.input.observations,
          isWide: true,
        },
      ]}
    />
  );
}

async function CamEvaluationSection({
  guest,
}: {
  guest: GuestEvaluationsSlot;
}) {
  const { access } = await getCurrentUser();
  const evaluation = await findCamEvaluationOfGuest(guest.id);
  const today = getBusinessDate(new Date());
  const canCreate =
    !guest.isAnnulled &&
    !evaluation &&
    hasPermission(access, "guests.cam_evaluations.create");
  const canUpdate =
    !guest.isAnnulled &&
    evaluation !== null &&
    hasPermission(access, "guests.cam_evaluations.update");

  return (
    <section
      aria-labelledby={CAM_SECTION_TITLE_ID}
      className="flex flex-col gap-4"
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h2 id={CAM_SECTION_TITLE_ID} className="text-lg font-semibold">
          Evaluación CAM
        </h2>
        {canCreate && (
          <CamEvaluationButton
            guestId={guest.id}
            guestFullName={guest.fullName}
            mode={{ kind: "create" }}
            initialEvaluation={buildEmptyCamEvaluation(today)}
            today={today}
          />
        )}
        {canUpdate && (
          <CamEvaluationButton
            guestId={guest.id}
            guestFullName={guest.fullName}
            mode={{ kind: "update", version: evaluation.version }}
            initialEvaluation={evaluation.input}
            today={today}
          />
        )}
      </div>
      {evaluation ? (
        <>
          <EvaluationHistory {...evaluation} />
          <CamEvaluationDetail evaluation={evaluation} />
        </>
      ) : (
        <p className="text-base text-muted-foreground">
          Todavía no se cargó la evaluación CAM.
        </p>
      )}
    </section>
  );
}

export async function GuestEvaluations({
  guest,
}: {
  guest: GuestEvaluationsSlot;
}) {
  const { access } = await getCurrentUser();
  return (
    <div className="flex flex-col gap-10">
      {hasPermission(access, "guests.cam_evaluations.view") && (
        <CamEvaluationSection guest={guest} />
      )}
      {hasPermission(access, "guests.physical_evaluations.view") && (
        <PhysicalEvaluationSection guest={guest} />
      )}
    </div>
  );
}
