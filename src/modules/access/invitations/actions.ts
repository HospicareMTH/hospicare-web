"use server";

import {
  type ActionResult,
  refreshOnSuccess,
  toInvalidResult,
  toRejectedResult,
} from "@/platform/operation-result";

import {
  invitationIdSchema,
  type InvitationInput,
  invitationInputSchema,
} from "./schemas";
import { type NewPasswordInput, newPasswordSchema } from "../auth/schemas";
import {
  acceptInvitation,
  createInvitation,
  revokeInvitation,
} from "./service";
import { requirePermission } from "../authorization/service";

export async function createInvitationAction(
  input: InvitationInput,
): Promise<ActionResult> {
  const { access } = await requirePermission("admin.invitations.create");
  const invitation = invitationInputSchema.safeParse(input);
  if (!invitation.success) {
    return toInvalidResult(invitation.error);
  }
  return refreshOnSuccess(await createInvitation(access, invitation.data));
}

export async function revokeInvitationAction(
  invitationId: string,
): Promise<ActionResult> {
  const { access } = await requirePermission("admin.invitations.delete");
  const parsedInvitationId = invitationIdSchema.safeParse(invitationId);
  if (!parsedInvitationId.success) {
    return toRejectedResult(parsedInvitationId.error);
  }
  return refreshOnSuccess(
    await revokeInvitation(access, parsedInvitationId.data),
  );
}

export async function acceptInvitationAction(
  input: NewPasswordInput,
): Promise<ActionResult> {
  const acceptance = newPasswordSchema.safeParse(input);
  if (!acceptance.success) {
    return toInvalidResult(acceptance.error);
  }
  return acceptInvitation(acceptance.data.token, acceptance.data.password);
}
