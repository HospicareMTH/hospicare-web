import { createHash, randomBytes } from "node:crypto";

import { hashPassword } from "better-auth/crypto";
import QRCode from "qrcode";
import { z } from "zod";

import { recordFailedSignIn } from "@/modules/audit";
import {
  type DatabaseTransaction,
  runInTransaction,
  runInTransactionAs,
  setTransactionActor,
} from "@/platform/database/client";
import { sendMail } from "@/platform/mail";

import { ALL_PERMISSIONS, isPermission, type Permission } from "./permissions";

import {
  type AccessRevocationRecord,
  addRolePermissions,
  deleteRole as deleteRoleRecord,
  deleteUserSessions,
  findAccessRevocation,
  findInvitationByTokenHash,
  findUserAccessRecord,
  findUserIdByEmail,
  hasInvitationWithRole,
  hasPendingInvitation,
  hasUserWithRole,
  insertInvitation,
  insertRole,
  insertUserWithPassword,
  type InvitationSummary,
  isEmailRegistered,
  isRoleNameTaken,
  listInvitations as listInvitationRecords,
  listRoles as listRoleRecords,
  listUsers as listUserRecords,
  type LockedInvitation,
  lockInvitation,
  lockInvitationByTokenHash,
  lockRole,
  lockSystemRole,
  lockUser,
  lockUserEmailVerification,
  markInvitationAccepted,
  markInvitationRevoked,
  removeRolePermissions,
  type RoleOption,
  type RoleSummary,
  SUPER_USER_SYSTEM_KEY,
  updateAccessRevocation,
  updateRoleDetails,
  updateUserName,
  updateUserRole,
  type UserSummary,
} from "./repository";
import { INVITATION_ACCEPTANCE_PATH } from "./routes";
import {
  type AccessRevocation,
  type InvitationListQuery,
  type InvitationSortKey,
  type InvitationState,
  type ListQuery,
  type RoleDetails,
  type RoleListQuery,
  type RoleSortKey,
  type SuperUserInput,
  signInRequestBodySchema,
  superUserInputSchema,
  type UserListQuery,
  type UserSortKey,
  type ValidInvitationInput,
  type ValidUserCreationInput,
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

export const LIST_PAGE_SIZE = 10;
const LOCALE = "es-AR";

export type ListPage<Item> = {
  items: Item[];
  totalCount: number;
  page: number;
  pageCount: number;
};

type Comparator<Item> = (first: Item, second: Item) => number;

function normalizeForSearch(text: string): string {
  return text
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLocaleLowerCase(LOCALE);
}

function compareText(first: string, second: string): number {
  return first.localeCompare(second, LOCALE);
}

// shortcut: filtra y pagina en memoria porque las listas de acceso son chicas; pasar a SQL si superan los miles.
function paginateList<Item, SortKey extends string>(
  items: Item[],
  { search, sort, page }: ListQuery<SortKey>,
  searchableText: (item: Item) => string,
  comparators: Record<SortKey, Comparator<Item>>,
): ListPage<Item> {
  const normalizedSearch = normalizeForSearch(search);
  const compare = comparators[sort.key];
  const matchingItems = items
    .filter((item) =>
      normalizeForSearch(searchableText(item)).includes(normalizedSearch),
    )
    .sort((first, second) =>
      sort.isDescending ? compare(second, first) : compare(first, second),
    );

  const pageCount = Math.max(
    1,
    Math.ceil(matchingItems.length / LIST_PAGE_SIZE),
  );
  const currentPage = Math.min(page, pageCount);
  const pageStart = (currentPage - 1) * LIST_PAGE_SIZE;
  return {
    items: matchingItems.slice(pageStart, pageStart + LIST_PAGE_SIZE),
    totalCount: matchingItems.length,
    page: currentPage,
    pageCount,
  };
}

const ROLE_COMPARATORS: Record<RoleSortKey, Comparator<RoleListItem>> = {
  name: (first, second) => compareText(first.name, second.name),
  permissions: (first, second) =>
    first.permissions.length - second.permissions.length,
  users: (first, second) => first.userCount - second.userCount,
};

export async function searchRoles(
  query: RoleListQuery,
): Promise<ListPage<RoleListItem>> {
  return paginateList(
    await listRoles(),
    query,
    (role) => `${role.name} ${role.description ?? ""}`,
    ROLE_COMPARATORS,
  );
}

type RejectedOperation = { status: "rejected"; message: string };

export type OperationResult = { status: "success" } | RejectedOperation;

const SUCCESS: OperationResult = { status: "success" };

function reject(message: string): RejectedOperation {
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
  roleHasInvitations:
    "No se puede eliminar: el rol figura en invitaciones, aunque estén vencidas o revocadas.",
} as const;

export async function createRole(
  actor: UserAccess,
  details: RoleDetails,
): Promise<OperationResult> {
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
): Promise<OperationResult> {
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
): Promise<OperationResult> {
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
): Promise<OperationResult> {
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
    if (await hasInvitationWithRole(transaction, roleId)) {
      return reject(ROLE_REJECTION_MESSAGES.roleHasInvitations);
    }
    await deleteRoleRecord(transaction, roleId);
    return SUCCESS;
  });
}

export function isAccessRevoked(
  record: AccessRevocationRecord,
  now: Date,
): boolean {
  return (
    record.accessRevokedAt !== null &&
    (record.accessRevokedUntil === null || record.accessRevokedUntil > now)
  );
}

export async function isUserAccessRevoked(userId: string): Promise<boolean> {
  const record = await findAccessRevocation(userId);
  return record !== null && isAccessRevoked(record, new Date());
}

const PASSWORD_RESET_VALIDITY_MINUTES = 30;
export const PASSWORD_RESET_VALIDITY_SECONDS =
  PASSWORD_RESET_VALIDITY_MINUTES * 60;

type PasswordResetRecipient = { id: string; name: string; email: string };

export async function sendPasswordResetMail(
  recipient: PasswordResetRecipient,
  resetUrl: string,
): Promise<void> {
  if (await isUserAccessRevoked(recipient.id)) {
    return;
  }
  try {
    await sendMail({
      to: recipient.email,
      subject: "Recuperá tu contraseña de Hospicare",
      text: `Hola ${recipient.name}: creá una contraseña nueva desde este enlace, que vence en ${PASSWORD_RESET_VALIDITY_MINUTES} minutos: ${resetUrl}. Si no lo pediste, ignorá este correo.`,
      actionUrl: resetUrl,
    });
  } catch (error) {
    // Se registra sin propagar: un error visible revelaría que el correo tiene cuenta.
    console.error("No se pudo enviar el correo de recuperación.", error);
  }
}

const EMAIL_VERIFICATION_CODE_VALIDITY_MINUTES = 5;
export const EMAIL_VERIFICATION_CODE_VALIDITY_SECONDS =
  EMAIL_VERIFICATION_CODE_VALIDITY_MINUTES * 60;
export const TWO_FACTOR_CODE_VALIDITY_MINUTES = 3;

export async function sendEmailVerificationCode(
  email: string,
  code: string,
): Promise<void> {
  await sendMail({
    to: email,
    subject: "Tu código de verificación de Hospicare",
    text: `Tu código es ${code}. Vence en ${EMAIL_VERIFICATION_CODE_VALIDITY_MINUTES} minutos.`,
    code,
  });
}

export async function sendTwoFactorCode(
  email: string,
  code: string,
): Promise<void> {
  await sendMail({
    to: email,
    subject: "Tu código para entrar a Hospicare",
    text: `Tu código es ${code}. Vence en ${TWO_FACTOR_CODE_VALIDITY_MINUTES} minutos.`,
    code,
  });
}

export async function renderTotpQrCode(totpUri: string): Promise<string> {
  const svg = await QRCode.toString(totpUri, { type: "svg", margin: 1 });
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
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

const MILLISECONDS_PER_DAY = 86_400_000;

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

const INVITATION_VALIDITY_DAYS = 7;
const INVITATION_TOKEN_BYTES = 32;
const INVITATION_TOKEN_PARAMETER = "token";

const applicationUrlSchema = z.url({
  error: "BETTER_AUTH_URL debe ser una URL.",
});

function hashInvitationToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

function buildInvitationUrl(token: string): string {
  const url = new URL(
    INVITATION_ACCEPTANCE_PATH,
    applicationUrlSchema.parse(process.env.BETTER_AUTH_URL),
  );
  url.searchParams.set(INVITATION_TOKEN_PARAMETER, token);
  return url.toString();
}

function getInvitationState(
  invitation: Pick<LockedInvitation, "status" | "expiresAt">,
  now: Date,
): InvitationState {
  if (invitation.status === "pending" && invitation.expiresAt <= now) {
    return "expired";
  }
  return invitation.status;
}

export const INVITATION_REJECTION_MESSAGES = {
  roleNotFound: "El rol elegido ya no existe. Actualizá la pantalla.",
  superUserRoleOnly: "Solo un Super user puede invitar con el rol Super user.",
  roleNotAllowed: "Solo podés invitar con un rol cuyos permisos tengas.",
  emailRegistered: "Ese correo ya tiene una cuenta.",
  invitationPending: "Ese correo ya tiene una invitación pendiente.",
  mailFailed:
    "No pudimos enviar el correo, así que la invitación quedó revocada. Probá de nuevo en unos minutos.",
  invitationNotFound: "La invitación ya no existe. Actualizá la pantalla.",
  invitationNotPending: "Solo se pueden revocar invitaciones pendientes.",
  invalidLink:
    "Este enlace ya no es válido. Pedile una nueva invitación a un administrador.",
} as const;

function canGrantRole(
  actor: UserAccess,
  role: { systemKey: string | null; permissions: string[] },
): boolean {
  if (role.systemKey === SUPER_USER_SYSTEM_KEY) {
    return actor.isSuperUser;
  }
  return role.permissions.every(
    (permission) =>
      isPermission(permission) && hasPermission(actor, permission),
  );
}

export async function listInvitableRoles(
  actor: UserAccess,
): Promise<RoleOption[]> {
  const roles = await listRoleRecords();
  return roles
    .filter((role) => canGrantRole(actor, role))
    .map(({ id, name }) => ({ id, name }));
}

export async function listRoleFilterOptions(): Promise<RoleOption[]> {
  const roles = await listRoleRecords();
  return roles.map(({ id, name }) => ({ id, name }));
}

type CreatedInvitation =
  { status: "created"; invitationId: string } | RejectedOperation;

function insertCheckedInvitation(
  actor: UserAccess,
  input: ValidInvitationInput,
  tokenHash: string,
): Promise<CreatedInvitation> {
  return runInTransactionAs(actor.userId, async (transaction) => {
    const now = new Date();
    const role = await lockRole(transaction, input.roleId);
    if (!role) {
      return reject(INVITATION_REJECTION_MESSAGES.roleNotFound);
    }
    if (role.systemKey === SUPER_USER_SYSTEM_KEY && !actor.isSuperUser) {
      return reject(INVITATION_REJECTION_MESSAGES.superUserRoleOnly);
    }
    if (!canGrantRole(actor, role)) {
      return reject(INVITATION_REJECTION_MESSAGES.roleNotAllowed);
    }
    if (await isEmailRegistered(transaction, input.email)) {
      return reject(INVITATION_REJECTION_MESSAGES.emailRegistered);
    }
    if (await hasPendingInvitation(transaction, input.email, now)) {
      return reject(INVITATION_REJECTION_MESSAGES.invitationPending);
    }
    const invitationId = await insertInvitation(transaction, {
      ...input,
      tokenHash,
      expiresAt: new Date(
        now.getTime() + INVITATION_VALIDITY_DAYS * MILLISECONDS_PER_DAY,
      ),
      invitedByUserId: actor.userId,
    });
    return { status: "created", invitationId };
  });
}

export async function createInvitation(
  actor: UserAccess,
  input: ValidInvitationInput,
): Promise<OperationResult> {
  const token = randomBytes(INVITATION_TOKEN_BYTES).toString("base64url");
  const created = await insertCheckedInvitation(
    actor,
    input,
    hashInvitationToken(token),
  );
  if (created.status === "rejected") {
    return created;
  }

  const invitationUrl = buildInvitationUrl(token);
  try {
    await sendMail({
      to: input.email,
      subject: "Te invitaron a Hospicare",
      text: `Hola ${input.name}: el equipo del Hospice Madre Teresa te dio acceso a Hospicare. Creá tu contraseña desde este enlace, que vence en ${INVITATION_VALIDITY_DAYS} días: ${invitationUrl}`,
      actionUrl: invitationUrl,
    });
  } catch (error) {
    console.error("No se pudo enviar el correo de invitación.", error);
    await runInTransactionAs(actor.userId, (transaction) =>
      markInvitationRevoked(transaction, created.invitationId, null),
    );
    return reject(INVITATION_REJECTION_MESSAGES.mailFailed);
  }
  return SUCCESS;
}

export async function revokeInvitation(
  actor: UserAccess,
  invitationId: string,
): Promise<OperationResult> {
  return runInTransactionAs(actor.userId, async (transaction) => {
    const invitation = await lockInvitation(transaction, invitationId);
    if (!invitation) {
      return reject(INVITATION_REJECTION_MESSAGES.invitationNotFound);
    }
    if (getInvitationState(invitation, new Date()) !== "pending") {
      return reject(INVITATION_REJECTION_MESSAGES.invitationNotPending);
    }
    await markInvitationRevoked(transaction, invitationId, actor.userId);
    return SUCCESS;
  });
}

export type InvitationListItem = {
  id: string;
  name: string;
  email: string;
  roleName: string;
  state: InvitationState;
  createdAt: Date;
  expiresAt: Date;
};

function toInvitationListItem(
  invitation: InvitationSummary,
  now: Date,
): InvitationListItem {
  return {
    id: invitation.id,
    name: invitation.name,
    email: invitation.email,
    roleName: invitation.roleName,
    state: getInvitationState(invitation, now),
    createdAt: invitation.createdAt,
    expiresAt: invitation.expiresAt,
  };
}

const INVITATION_COMPARATORS: Record<
  InvitationSortKey,
  Comparator<InvitationListItem>
> = {
  createdAt: (first, second) =>
    first.createdAt.getTime() - second.createdAt.getTime(),
  name: (first, second) => compareText(first.name, second.name),
  expiresAt: (first, second) =>
    first.expiresAt.getTime() - second.expiresAt.getTime(),
};

export async function searchInvitations({
  state,
  roleId,
  ...query
}: InvitationListQuery): Promise<ListPage<InvitationListItem>> {
  const now = new Date();
  const invitations = (await listInvitationRecords())
    .filter((invitation) => roleId === null || invitation.roleId === roleId)
    .map((invitation) => toInvitationListItem(invitation, now))
    .filter((invitation) => state === null || invitation.state === state);
  return paginateList(
    invitations,
    query satisfies ListQuery<InvitationSortKey>,
    (invitation) =>
      `${invitation.name} ${invitation.email} ${invitation.roleName}`,
    INVITATION_COMPARATORS,
  );
}

export type InvitationPreview =
  | { status: "valid"; name: string; email: string; roleName: string }
  | { status: "invalid" };

export async function previewInvitation(
  token: string,
): Promise<InvitationPreview> {
  const invitation = await findInvitationByTokenHash(
    hashInvitationToken(token),
  );
  if (!invitation || getInvitationState(invitation, new Date()) !== "pending") {
    return { status: "invalid" };
  }
  return {
    status: "valid",
    name: invitation.name,
    email: invitation.email,
    roleName: invitation.roleName,
  };
}

export async function acceptInvitation(
  token: string,
  password: string,
): Promise<OperationResult> {
  if ((await previewInvitation(token)).status === "invalid") {
    return reject(INVITATION_REJECTION_MESSAGES.invalidLink);
  }
  const passwordHash = await hashPassword(password);
  return runInTransaction(async (transaction) => {
    const invitation = await lockInvitationByTokenHash(
      transaction,
      hashInvitationToken(token),
    );
    if (
      !invitation ||
      getInvitationState(invitation, new Date()) !== "pending" ||
      (await isEmailRegistered(transaction, invitation.email))
    ) {
      return reject(INVITATION_REJECTION_MESSAGES.invalidLink);
    }

    const userId = await insertUserWithPassword(transaction, {
      name: invitation.name,
      email: invitation.email,
      passwordHash,
      roleId: invitation.roleId,
    });
    await setTransactionActor(transaction, userId);
    await markInvitationAccepted(transaction, invitation.id, userId);
    return SUCCESS;
  });
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
  emailNotVerified: "Verificá tu correo para hacer esta acción.",
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

export async function updateOwnName(
  userId: string,
  name: string,
): Promise<OperationResult> {
  return runInTransactionAs(userId, async (transaction) => {
    const isEmailVerified = await lockUserEmailVerification(
      transaction,
      userId,
    );
    if (isEmailVerified === null) {
      return reject(USER_REJECTION_MESSAGES.userNotFound);
    }
    if (!isEmailVerified) {
      return reject(USER_REJECTION_MESSAGES.emailNotVerified);
    }
    await updateUserName(transaction, userId, name);
    return SUCCESS;
  });
}

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
