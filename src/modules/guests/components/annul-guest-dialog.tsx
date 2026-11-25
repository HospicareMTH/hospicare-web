"use client";

import { AnnulmentDialog } from "@/components/shared/annulment-dialog";

import { annulGuestAction } from "../actions";
import type { GuestOrigin } from "../tables";

export type GuestToAnnul = {
  id: string;
  fullName: string;
  clinicalRecordNumber: number;
  origin: GuestOrigin;
};

const INTERVIEW_CONSEQUENCE =
  " Su entrevista vuelve a quedar sin aceptar. Si se acepta de nuevo, se crea otro huésped con otro número.";

function describeAnnulment({ clinicalRecordNumber, origin }: GuestToAnnul) {
  const description = `Sale del listado y ya no se va a poder modificar. No se borra: quedan registrados quién lo anuló, cuándo y el motivo. Su número de historia clínica (N.° ${clinicalRecordNumber}) no se vuelve a usar. No se puede deshacer.`;
  return origin === "admission"
    ? description + INTERVIEW_CONSEQUENCE
    : description;
}

export function AnnulGuestDialog({
  guest,
  onClose,
}: {
  guest: GuestToAnnul;
  onClose: () => void;
}) {
  return (
    <AnnulmentDialog
      title={`Anular al huésped ${guest.fullName}`}
      description={describeAnnulment(guest)}
      submitLabel="Anular huésped"
      successMessage="Huésped anulado."
      annul={(input) => annulGuestAction(guest.id, input)}
      onClose={onClose}
    />
  );
}
