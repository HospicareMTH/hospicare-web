"use client";

import { AnnulmentDialog } from "@/components/shared/annulment-dialog";

import { annulAdmissionInterviewAction } from "../actions";

export function AnnulInterviewDialog({
  interviewId,
  guestFullName,
  onClose,
}: {
  interviewId: string;
  guestFullName: string;
  onClose: () => void;
}) {
  return (
    <AnnulmentDialog
      title={`Anular la entrevista de ${guestFullName}`}
      description="Sale del listado y ya no se va a poder modificar. No se borra: quedan registrados quién la anuló, cuándo y el motivo. No se puede deshacer."
      submitLabel="Anular entrevista"
      successMessage="Entrevista anulada."
      annul={(input) => annulAdmissionInterviewAction(interviewId, input)}
      onClose={onClose}
    />
  );
}
