import { hashPassword } from "better-auth/crypto";

import {
  type Comparator,
  compareText,
  type ListPage,
  paginateList,
} from "@/platform/list-query";
import {
  type DatabaseTransaction,
  runInTransaction,
  runInTransactionAs,
} from "@/platform/database/client";
import {
  type OperationResult,
  reject,
  type RejectedOperation,
  SUCCESS,
} from "@/platform/operation-result";

import {
  type AccessRevocation,
  type SuperUserInput,
  superUserInputSchema,
  type UserListQuery,
  type UserSortKey,
  type ValidUserCreationInput,
} from "./schemas";
import { SUPER_USER_SYSTEM_KEY } from "../authorization/repository";
import type { UserAccess } from "../authorization/service";
import {
  deleteUserSessions,
  hasPendingInvitation,
  insertUserWithPassword,
  isEmailRegistered,
  listUsers as listUserRecords,
  lockUser,
  updateAccessRevocation,
  updateUserRole,
  type UserSummary,
} from "./repository";
import { canGrantRole } from "../roles/service";
import { hasUserWithRole, lockRole, lockSystemRole } from "../roles/repository";
import { isAccessRevoked } from "../auth/service";

export type FirstSuperUserResult =
  "created" | "super-user-already-exists" | "email-already-registered";

export async function createFirstSuperUser(
  input: SuperUserInput,
): Promise<FirstSuperUserResult> {
  const { name, email, password } = superUserInputSchema.parse(input);
  const passwordHash = await hashPassword(password);

  return runInTransaction(async (transaction) => {
    const superUserRoleId = await lockSystemRole(
      transaction,
      SUPER_USER_SYSTEM_KEY,
    );
    if (!superUserRoleId) {
      throw new Error(
        "Falta el rol Super user en la base: aplicá las migraciones.",
      );
    }
    if (await hasUserWithRole(transaction, superUserRoleId)) {
      return "super-user-already-exists";
    }
    if (await isEmailRegistered(transaction, email)) {
      return "email-already-registered";
    }

    await insertUserWithPassword(transaction, {
      name,
      email,
      passwordHash,
      roleId: superUserRoleId,
    });
    return "created";
  });
}

export type UserListItem = {
  id: string;
  name: string;
  email: string;
  roleId: string | null;
  roleName: string | null;
  isSuperUser: boolean;
  isEmailVerified: boolean;
  isTwoFactorEnabled: boolean;
  isRevoked: boolean;
  accessRevokedUntil: Date | null;
  accessRevocationReason: string | null;
};

function toUserListItem(user: UserSummary, now: Date): UserListItem {
  const isRevoked = isAccessRevoked(user, now);
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    roleId: user.roleId,
    roleName: user.roleName,
    isSuperUser: user.roleSystemKey === SUPER_USER_SYSTEM_KEY,
    isEmailVerified: user.emailVerified,
    isTwoFactorEnabled: user.twoFactorEnabled,
    isRevoked,
    accessRevokedUntil: isRevoked ? user.accessRevokedUntil : null,
    accessRevocationReason: isRevoked ? user.accessRevocationReason : null,
  };
}

const USER_COMPARATORS: Record<UserSortKey, Comparator<UserListItem>> = {
  name: (first, second) => compareText(first.name, second.name),
  email: (first, second) => compareText(first.email, second.email),
  role: (first, second) =>
    compareText(first.roleName ?? "", second.roleName ?? ""),
};

export async function searchUsers(
  query: UserListQuery,
): Promise<ListPage<UserListItem>> {
  const now = new Date();
  const users = (await listUserRecords()).map((user) =>
    toUserListItem(user, now),
  );
  return paginateList(
    users,
    query,
    (user) => `${user.name} ${user.email} ${user.roleName ?? ""}`,
    USER_COMPARATORS,
  );
}

export const MILLISECONDS_PER_DAY = 86_400_000;

export const ACCESS_REJECTION_MESSAGES = {
  userNotFound: "La persona ya no existe. Actualizá la pantalla.",
  ownAccount: "No podés cambiar el acceso de tu propia cuenta.",
  superUserOnly:
    "Solo un Super user puede cambiar el acceso de otro Super user.",
  alreadyRevoked: "Ese acceso ya está revocado.",
  notRevoked: "Ese acceso no está revocado.",
} as const;

type AccessChange = (
  transaction: DatabaseTransaction,
  targetUserId: string,
  isRevoked: boolean,
  now: Date,
) => Promise<OperationResult>;

async function changeUserAccess(
  actor: UserAccess,
  targetUserId: string,
  change: AccessChange,
): Promise<OperationResult> {
  if (targetUserId === actor.userId) {
    return reject(ACCESS_REJECTION_MESSAGES.ownAccount);
  }
  return runInTransactionAs(actor.userId, async (transaction) => {
    const target = await lockUser(transaction, targetUserId);
    if (!target) {
      return reject(ACCESS_REJECTION_MESSAGES.userNotFound);
    }
    if (target.roleSystemKey === SUPER_USER_SYSTEM_KEY && !actor.isSuperUser) {
      return reject(ACCESS_REJECTION_MESSAGES.superUserOnly);
    }
    const now = new Date();
    return change(transaction, target.id, isAccessRevoked(target, now), now);
  });
}

export async function revokeUserAccess(
  actor: UserAccess,
  targetUserId: string,
  { duration, reason }: AccessRevocation,
): Promise<OperationResult> {
  return changeUserAccess(
    actor,
    targetUserId,
    async (transaction, userId, isRevoked, now) => {
      if (isRevoked) {
        return reject(ACCESS_REJECTION_MESSAGES.alreadyRevoked);
      }
      await updateAccessRevocation(transaction, userId, {
        revokedAt: now,
        revokedUntil:
          duration.kind === "temporary"
            ? new Date(now.getTime() + duration.days * MILLISECONDS_PER_DAY)
            : null,
        reason,
        revokedByUserId: actor.userId,
      });
      await deleteUserSessions(transaction, userId);
      return SUCCESS;
    },
  );
}

export async function restoreUserAccess(
  actor: UserAccess,
  targetUserId: string,
): Promise<OperationResult> {
  return changeUserAccess(
    actor,
    targetUserId,
    async (transaction, userId, isRevoked) => {
      if (!isRevoked) {
        return reject(ACCESS_REJECTION_MESSAGES.notRevoked);
      }
      await updateAccessRevocation(transaction, userId, null);
      return SUCCESS;
    },
  );
}

export const USER_REJECTION_MESSAGES = {
  roleNotFound: "El rol elegido ya no existe. Actualizá la pantalla.",
  superUserRoleOnly: "Solo un Super user puede asignar el rol Super user.",
  roleNotAllowed: "Solo podés asignar un rol cuyos permisos tengas.",
  emailRegistered: "Ese correo ya tiene una cuenta.",
  invitationPending: "Ese correo ya tiene una invitación pendiente.",
  userNotFound: "La persona ya no existe. Actualizá la pantalla.",
  ownRole: "No podés cambiar tu propio rol.",
  superUserOnly: "Solo un Super user puede cambiar el rol de otro Super user.",
  sameRole: "La persona ya tiene ese rol.",
} as const;

function checkGrantableRole(
  actor: UserAccess,
  role: { systemKey: string | null; permissions: string[] } | null,
): RejectedOperation | null {
  if (!role) {
    return reject(USER_REJECTION_MESSAGES.roleNotFound);
  }
  if (role.systemKey === SUPER_USER_SYSTEM_KEY && !actor.isSuperUser) {
    return reject(USER_REJECTION_MESSAGES.superUserRoleOnly);
  }
  if (!canGrantRole(actor, role)) {
    return reject(USER_REJECTION_MESSAGES.roleNotAllowed);
  }
  return null;
}

export async function createUser(
  actor: UserAccess,
  input: ValidUserCreationInput,
): Promise<OperationResult> {
  const passwordHash = await hashPassword(input.password);
  return runInTransactionAs(actor.userId, async (transaction) => {
    const roleRejection = checkGrantableRole(
      actor,
      await lockRole(transaction, input.roleId),
    );
    if (roleRejection) {
      return roleRejection;
    }
    if (await isEmailRegistered(transaction, input.email)) {
      return reject(USER_REJECTION_MESSAGES.emailRegistered);
    }
    if (await hasPendingInvitation(transaction, input.email, new Date())) {
      return reject(USER_REJECTION_MESSAGES.invitationPending);
    }
    await insertUserWithPassword(transaction, {
      name: input.name,
      email: input.email,
      passwordHash,
      roleId: input.roleId,
      emailVerified: input.isEmailVerified,
    });
    return SUCCESS;
  });
}

export async function changeUserRole(
  actor: UserAccess,
  targetUserId: string,
  roleId: string,
): Promise<OperationResult> {
  if (targetUserId === actor.userId) {
    return reject(USER_REJECTION_MESSAGES.ownRole);
  }
  return runInTransactionAs(actor.userId, async (transaction) => {
    const target = await lockUser(transaction, targetUserId);
    if (!target) {
      return reject(USER_REJECTION_MESSAGES.userNotFound);
    }
    if (target.roleSystemKey === SUPER_USER_SYSTEM_KEY && !actor.isSuperUser) {
      return reject(USER_REJECTION_MESSAGES.superUserOnly);
    }
    const roleRejection = checkGrantableRole(
      actor,
      await lockRole(transaction, roleId),
    );
    if (roleRejection) {
      return roleRejection;
    }
    if (target.roleId === roleId) {
      return reject(USER_REJECTION_MESSAGES.sameRole);
    }
    await updateUserRole(transaction, target.id, roleId);
    return SUCCESS;
  });
}
