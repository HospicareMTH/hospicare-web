import { hashPassword } from "better-auth/crypto";

import { recordFailedSignIn } from "@/modules/audit";
import {
  runInTransaction,
  runInTransactionAs,
} from "@/platform/database/client";

import { ALL_PERMISSIONS, isPermission, type Permission } from "./permissions";

import {
  addRolePermissions,
  deleteRole as deleteRoleRecord,
  findUserAccessRecord,
  findUserIdByEmail,
  hasUserWithRole,
  insertRole,
  insertUserWithPassword,
  isEmailRegistered,
  isRoleNameTaken,
  listRoles as listRoleRecords,
  lockRole,
  lockSystemRole,
  removeRolePermissions,
  type RoleSummary,
  SUPER_USER_SYSTEM_KEY,
  updateRoleDetails,
} from "./repository";
import {
  type RoleDetails,
  type RoleListQuery,
  type RoleSortKey,
  type SuperUserInput,
  signInRequestBodySchema,
  superUserInputSchema,
} from "./schemas";

export const CLIENT_IP_HEADER = "cf-connecting-ip";
const USER_AGENT_HEADER = "user-agent";

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

type SignInAttempt = {
  body: unknown;
  headers: Headers | undefined;
};

export async function recordFailedSignInAttempt({
  body,
  headers,
}: SignInAttempt): Promise<void> {
  const parsedBody = signInRequestBodySchema.safeParse(body);
  const targetUserId = parsedBody.success
    ? await findUserIdByEmail(parsedBody.data.email.toLowerCase())
    : null;

  await recordFailedSignIn({
    targetUserId,
    ipAddress: headers?.get(CLIENT_IP_HEADER) ?? null,
    userAgent: headers?.get(USER_AGENT_HEADER) ?? null,
  });
}

export type UserAccess = {
  userId: string;
  roleId: string | null;
  isSuperUser: boolean;
  permissions: ReadonlySet<Permission>;
};

export async function getUserAccess(userId: string): Promise<UserAccess> {
  const record = await findUserAccessRecord(userId);
  if (!record) {
    return { userId, roleId: null, isSuperUser: false, permissions: new Set() };
  }
  const isSuperUser = record.roleSystemKey === SUPER_USER_SYSTEM_KEY;
  return {
    userId,
    roleId: record.roleId,
    isSuperUser,
    permissions: new Set(
      isSuperUser ? ALL_PERMISSIONS : record.permissions.filter(isPermission),
    ),
  };
}

export function hasPermission(
  access: UserAccess,
  permission: Permission,
): boolean {
  return access.permissions.has(permission);
}

export type RoleListItem = Omit<RoleSummary, "systemKey" | "permissions"> & {
  isSystemRole: boolean;
  isSuperUserRole: boolean;
  permissions: Permission[];
};

export async function listRoles(): Promise<RoleListItem[]> {
  const roles = await listRoleRecords();
  return roles.map(({ systemKey, permissions, ...role }) => {
    const isSuperUserRole = systemKey === SUPER_USER_SYSTEM_KEY;
    return {
      ...role,
      isSystemRole: systemKey !== null,
      isSuperUserRole,
      permissions: isSuperUserRole
        ? [...ALL_PERMISSIONS]
        : permissions.filter(isPermission),
    };
  });
}

export const ROLES_PAGE_SIZE = 10;

export type RolePage = {
  roles: RoleListItem[];
  totalCount: number;
  page: number;
  pageCount: number;
};

function normalizeForSearch(text: string): string {
  return text
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLocaleLowerCase("es-AR");
}

const ROLE_SORT_COMPARATORS: Record<
  RoleSortKey,
  (first: RoleListItem, second: RoleListItem) => number
> = {
  name: (first, second) => first.name.localeCompare(second.name, "es-AR"),
  permissions: (first, second) =>
    first.permissions.length - second.permissions.length,
  users: (first, second) => first.userCount - second.userCount,
};

// shortcut: filtra y pagina en memoria porque los roles son pocos; pasar a SQL si superan los cientos.
export async function searchRoles({
  search,
  sort,
  page,
}: RoleListQuery): Promise<RolePage> {
  const normalizedSearch = normalizeForSearch(search);
  const compare = ROLE_SORT_COMPARATORS[sort.key];
  const matchingRoles = (await listRoles())
    .filter((role) =>
      normalizeForSearch(`${role.name} ${role.description ?? ""}`).includes(
        normalizedSearch,
      ),
    )
    .sort((first, second) =>
      sort.isDescending ? compare(second, first) : compare(first, second),
    );

  const pageCount = Math.max(
    1,
    Math.ceil(matchingRoles.length / ROLES_PAGE_SIZE),
  );
  const currentPage = Math.min(page, pageCount);
  const pageStart = (currentPage - 1) * ROLES_PAGE_SIZE;
  return {
    roles: matchingRoles.slice(pageStart, pageStart + ROLES_PAGE_SIZE),
    totalCount: matchingRoles.length,
    page: currentPage,
    pageCount,
  };
}

export type RoleOperationResult =
  { status: "success" } | { status: "rejected"; message: string };

const SUCCESS: RoleOperationResult = { status: "success" };

function reject(message: string): RoleOperationResult {
  return { status: "rejected", message };
}

export const ROLE_REJECTION_MESSAGES = {
  roleNotFound: "El rol ya no existe. Actualizá la pantalla.",
  nameTaken: "Ya existe un rol con ese nombre.",
  systemRoleLocked: "Los roles de sistema no se pueden modificar ni eliminar.",
  superUserPermissionsLocked:
    "El Super user siempre tiene todos los permisos: no se pueden cambiar.",
  ownRolePermissionsLocked: "No podés cambiar los permisos de tu propio rol.",
  permissionNotHeld: "Solo podés otorgar permisos que vos tenés.",
  roleInUse: "No se puede eliminar: hay usuarios con este rol.",
} as const;

export async function createRole(
  actor: UserAccess,
  details: RoleDetails,
): Promise<RoleOperationResult> {
  return runInTransactionAs(actor.userId, async (transaction) => {
    if (await isRoleNameTaken(transaction, details.name, null)) {
      return reject(ROLE_REJECTION_MESSAGES.nameTaken);
    }
    await insertRole(transaction, details);
    return SUCCESS;
  });
}

export async function updateRole(
  actor: UserAccess,
  roleId: string,
  details: RoleDetails,
): Promise<RoleOperationResult> {
  return runInTransactionAs(actor.userId, async (transaction) => {
    const role = await lockRole(transaction, roleId);
    if (!role) {
      return reject(ROLE_REJECTION_MESSAGES.roleNotFound);
    }
    if (role.systemKey !== null) {
      return reject(ROLE_REJECTION_MESSAGES.systemRoleLocked);
    }
    if (await isRoleNameTaken(transaction, details.name, roleId)) {
      return reject(ROLE_REJECTION_MESSAGES.nameTaken);
    }
    await updateRoleDetails(transaction, roleId, details);
    return SUCCESS;
  });
}

export async function assignRolePermissions(
  actor: UserAccess,
  roleId: string,
  permissions: Permission[],
): Promise<RoleOperationResult> {
  return runInTransactionAs(actor.userId, async (transaction) => {
    const role = await lockRole(transaction, roleId);
    if (!role) {
      return reject(ROLE_REJECTION_MESSAGES.roleNotFound);
    }
    if (role.systemKey === SUPER_USER_SYSTEM_KEY) {
      return reject(ROLE_REJECTION_MESSAGES.superUserPermissionsLocked);
    }
    if (role.id === actor.roleId) {
      return reject(ROLE_REJECTION_MESSAGES.ownRolePermissionsLocked);
    }

    const current = new Set(role.permissions);
    const requested = new Set<string>(permissions);
    const granted = permissions.filter(
      (permission) => !current.has(permission),
    );
    const revoked = role.permissions.filter(
      (permission) => !requested.has(permission),
    );
    if (!granted.every((permission) => hasPermission(actor, permission))) {
      return reject(ROLE_REJECTION_MESSAGES.permissionNotHeld);
    }

    await removeRolePermissions(transaction, roleId, revoked);
    await addRolePermissions(transaction, roleId, granted);
    return SUCCESS;
  });
}

export async function deleteRole(
  actor: UserAccess,
  roleId: string,
): Promise<RoleOperationResult> {
  return runInTransactionAs(actor.userId, async (transaction) => {
    const role = await lockRole(transaction, roleId);
    if (!role) {
      return reject(ROLE_REJECTION_MESSAGES.roleNotFound);
    }
    if (role.systemKey !== null) {
      return reject(ROLE_REJECTION_MESSAGES.systemRoleLocked);
    }
    if (await hasUserWithRole(transaction, roleId)) {
      return reject(ROLE_REJECTION_MESSAGES.roleInUse);
    }
    await deleteRoleRecord(transaction, roleId);
    return SUCCESS;
  });
}
