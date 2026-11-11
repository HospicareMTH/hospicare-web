import { hasPermission, type UserAccess } from "../authorization/service";
import { getInvitationState } from "../invitations/service";
import { isAccessRevoked } from "../auth/service";
import { listInvitations as listInvitationRecords } from "../invitations/repository";
import { listRoles as listRoleRecords } from "../roles/repository";
import { listUsers as listUserRecords } from "../users/repository";

export type AdminSummary = {
  roleCount: number | null;
  userCount: number | null;
  activeUserCount: number | null;
  pendingInvitationCount: number | null;
};

export async function getAdminSummary(
  actor: UserAccess,
): Promise<AdminSummary> {
  const now = new Date();
  const canViewRoles = hasPermission(actor, "admin.roles.view");
  const canViewUsers = hasPermission(actor, "admin.users.view");
  const canViewInvitations = hasPermission(actor, "admin.invitations.view");
  const [roles, users, invitations] = await Promise.all([
    canViewRoles ? listRoleRecords() : null,
    canViewUsers ? listUserRecords() : null,
    canViewInvitations ? listInvitationRecords() : null,
  ]);
  return {
    roleCount: roles?.length ?? null,
    userCount: users?.length ?? null,
    activeUserCount:
      users?.filter((user) => !isAccessRevoked(user, now)).length ?? null,
    pendingInvitationCount:
      invitations?.filter(
        (invitation) => getInvitationState(invitation, now) === "pending",
      ).length ?? null,
  };
}
