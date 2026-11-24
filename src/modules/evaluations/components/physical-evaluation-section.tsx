import { PencilEdit02Icon, PlusSignIcon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import Link from "next/link";

import { DIALOG_BUTTON_CLASS_NAME } from "@/components/shared/form-styles";
import { Button } from "@/components/ui/button";
import { getCurrentUser, hasPermission } from "@/modules/access";
import type { GuestEvaluationsSlot } from "@/modules/guests";

import { buildPhysicalEvaluationPath } from "../schemas";
import { findPhysicalEvaluationOfGuest } from "../service";
import { EvaluationHistory } from "./evaluation-history";
import { PhysicalEvaluationDetail } from "./physical-evaluation-detail";

const SECTION_TITLE_ID = "physical-evaluation-title";

export async function PhysicalEvaluationSection({
  guest,
}: {
  guest: GuestEvaluationsSlot;
}) {
  const { access } = await getCurrentUser();
  const evaluation = await findPhysicalEvaluationOfGuest(guest.id);
  const canCreate =
    !guest.isAnnulled &&
    !evaluation &&
    hasPermission(access, "guests.physical_evaluations.create");
  const canUpdate =
    !guest.isAnnulled &&
    evaluation !== null &&
    hasPermission(access, "guests.physical_evaluations.update");

  return (
    <section aria-labelledby={SECTION_TITLE_ID} className="flex flex-col gap-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h2 id={SECTION_TITLE_ID} className="text-lg font-semibold">
          Evaluación física de ingreso
        </h2>
        {(canCreate || canUpdate) && (
          <Button
            asChild
            variant={canCreate ? "default" : "outline"}
            className={DIALOG_BUTTON_CLASS_NAME}
          >
            <Link href={buildPhysicalEvaluationPath(guest.id)}>
              <HugeiconsIcon
                icon={canCreate ? PlusSignIcon : PencilEdit02Icon}
                data-icon="inline-start"
                aria-hidden="true"
              />
              {canCreate ? "Cargar evaluación física de ingreso" : "Modificar"}
            </Link>
          </Button>
        )}
      </div>
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
    </section>
  );
}
