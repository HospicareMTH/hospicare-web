"use client";

import { UserCheck01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { useState } from "react";

import { ConfirmActionDialog } from "@/components/shared/confirm-action-dialog";
import { DIALOG_BUTTON_CLASS_NAME } from "@/components/shared/form-styles";
import { Button } from "@/components/ui/button";

import { acceptAdmissionInterviewAction } from "../actions";

const DUPLICATE_DNI_WARNING =
  " Ya hay otro huésped vigente con este DNI: revisá que no sea la misma persona.";

export function AcceptInterviewButton({
  interviewId,
  guestFullName,
  hasActiveGuestWithSameDni,
}: {
  interviewId: string;
  guestFullName: string;
  hasActiveGuestWithSameDni: boolean;
}) {
  const [isConfirming, setIsConfirming] = useState(false);

  return (
    <>
      <Button
        onClick={() => setIsConfirming(true)}
        className={DIALOG_BUTTON_CLASS_NAME}
      >
        <HugeiconsIcon
          icon={UserCheck01Icon}
          data-icon="inline-start"
          aria-hidden="true"
        />
        Aceptar entrevista
      </Button>
      {isConfirming && (
        <ConfirmActionDialog
          icon={UserCheck01Icon}
          title={`¿Aceptar la entrevista de ${guestFullName}?`}
          description={`Se crea el huésped con fecha de internación de hoy y el próximo número de historia clínica.${hasActiveGuestWithSameDni ? DUPLICATE_DNI_WARNING : ""}`}
          confirmLabel="Aceptar entrevista"
          pendingLabel="Aceptando…"
          successMessage={(result) =>
            result.wasCreated
              ? `Creaste el huésped con historia clínica N.° ${result.clinicalRecordNumber}.`
              : `Esta entrevista ya tenía su huésped: historia clínica N.° ${result.clinicalRecordNumber}.`
          }
          isDestructive={false}
          action={() => acceptAdmissionInterviewAction(interviewId)}
          onClose={() => setIsConfirming(false)}
        />
      )}
    </>
  );
}
