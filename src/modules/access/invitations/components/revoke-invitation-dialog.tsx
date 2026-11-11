"use client";

import { Cancel01Icon } from "@hugeicons/core-free-icons";

import { ConfirmActionDialog } from "@/components/shared/confirm-action-dialog";

import { revokeInvitationAction } from "../actions";
import type { InvitationListItem } from "../service";

export function RevokeInvitationDialog({
  invitation,
  onClose,
}: {
  invitation: InvitationListItem;
  onClose: () => void;
}) {
  return (
    <ConfirmActionDialog
      icon={Cancel01Icon}
      title={`¿Revocar la invitación de ${invitation.name}?`}
      description="El enlace que recibió deja de funcionar."
      confirmLabel="Revocar"
      pendingLabel="Revocando…"
      successMessage="Invitación revocada."
      isDestructive
      action={() => revokeInvitationAction(invitation.id)}
      onClose={onClose}
    />
  );
}
