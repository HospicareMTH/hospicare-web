import { z } from "zod";

import {
  type ListQuery,
  type ListSort,
  parseListQuery,
  readSearchParam,
  type SearchParams,
} from "@/platform/list-query";

import { emailSchema, personNameSchema } from "../schemas";
import { roleIdSchema, roleSelectionSchema } from "../roles/schemas";

export const INVITATION_SORT_KEYS = ["createdAt", "name", "expiresAt"] as const;

export type InvitationSortKey = (typeof INVITATION_SORT_KEYS)[number];

export const DEFAULT_INVITATION_SORT: ListSort<InvitationSortKey> = {
  key: "createdAt",
  isDescending: true,
};

export const INVITATION_STATES = [
  "pending",
  "expired",
  "accepted",
  "revoked",
] as const;

export type InvitationState = (typeof INVITATION_STATES)[number];

export const INVITATION_STATE_PARAMETERS: Record<InvitationState, string> = {
  pending: "pendiente",
  expired: "vencida",
  accepted: "aceptada",
  revoked: "revocada",
};

export type InvitationListQuery = ListQuery<InvitationSortKey> & {
  state: InvitationState | null;
  roleId: string | null;
};

export function parseInvitationListQuery(
  searchParams: SearchParams,
): InvitationListQuery {
  const stateParameter = readSearchParam(searchParams, "estado");
  const roleParameter = readSearchParam(searchParams, "rol");
  return {
    ...parseListQuery(
      searchParams,
      INVITATION_SORT_KEYS,
      DEFAULT_INVITATION_SORT,
    ),
    state:
      INVITATION_STATES.find(
        (state) => INVITATION_STATE_PARAMETERS[state] === stateParameter,
      ) ?? null,
    roleId: roleIdSchema.safeParse(roleParameter).success
      ? (roleParameter ?? null)
      : null,
  };
}

export const invitationInputSchema = z.object({
  name: personNameSchema,
  email: emailSchema,
  roleId: roleSelectionSchema,
});

export type InvitationInput = z.input<typeof invitationInputSchema>;

export type ValidInvitationInput = z.output<typeof invitationInputSchema>;

export const invitationIdSchema = z.uuid({
  error: "La invitación no es válida.",
});
