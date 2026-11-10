import { z } from "zod";

import { ALL_PERMISSIONS } from "./permissions";

export const ACCESS_REVOKED_ERROR_CODE = "ACCESS_REVOKED";
export const PASSWORD_MIN_LENGTH = 12;
export const PASSWORD_MAX_LENGTH = 256;
const NAME_MIN_LENGTH = 2;

export const superUserInputSchema = z.object({
  name: z
    .string()
    .trim()
    .min(NAME_MIN_LENGTH, {
      error: `El nombre debe tener al menos ${NAME_MIN_LENGTH} caracteres.`,
    }),
  email: z
    .email({ error: "El correo no es válido." })
    .transform((email) => email.toLowerCase()),
  password: z
    .string()
    .min(PASSWORD_MIN_LENGTH, {
      error: `La contraseña debe tener al menos ${PASSWORD_MIN_LENGTH} caracteres.`,
    })
    .max(PASSWORD_MAX_LENGTH, {
      error: `La contraseña no puede superar los ${PASSWORD_MAX_LENGTH} caracteres.`,
    }),
});

export type SuperUserInput = z.input<typeof superUserInputSchema>;

export const signInRequestBodySchema = z.object({ email: z.string() });

const ROLE_NAME_MIN_LENGTH = 2;
export const ROLE_NAME_MAX_LENGTH = 80;
export const ROLE_DESCRIPTION_MAX_LENGTH = 500;

export const roleIdSchema = z.uuid({ error: "El rol no es válido." });

export const roleDetailsSchema = z.object({
  name: z
    .string()
    .trim()
    .min(ROLE_NAME_MIN_LENGTH, {
      error: `El nombre debe tener al menos ${ROLE_NAME_MIN_LENGTH} caracteres.`,
    })
    .max(ROLE_NAME_MAX_LENGTH, {
      error: `El nombre no puede superar los ${ROLE_NAME_MAX_LENGTH} caracteres.`,
    }),
  description: z
    .string()
    .trim()
    .max(ROLE_DESCRIPTION_MAX_LENGTH, {
      error: `La descripción no puede superar los ${ROLE_DESCRIPTION_MAX_LENGTH} caracteres.`,
    })
    .transform((description) => description || null),
});

export type RoleDetailsInput = z.input<typeof roleDetailsSchema>;
export type RoleDetails = z.output<typeof roleDetailsSchema>;

export const rolePermissionsSchema = z
  .array(z.enum(ALL_PERMISSIONS, { error: "Hay un permiso que no existe." }))
  .transform((permissions) => [...new Set(permissions)]);

export type ListSort<SortKey extends string> = {
  key: SortKey;
  isDescending: boolean;
};

export type ListQuery<SortKey extends string> = {
  search: string;
  sort: ListSort<SortKey>;
  page: number;
};

const DESCENDING_PREFIX = "-";
const FIRST_PAGE = 1;

export function formatListSort({
  key,
  isDescending,
}: ListSort<string>): string {
  return isDescending ? `${DESCENDING_PREFIX}${key}` : key;
}

function parseListSort<SortKey extends string>(
  value: string | undefined,
  sortKeys: readonly SortKey[],
  defaultSort: ListSort<SortKey>,
): ListSort<SortKey> {
  const isDescending = value?.startsWith(DESCENDING_PREFIX) ?? false;
  const key = isDescending ? value?.slice(DESCENDING_PREFIX.length) : value;
  const sortKey = sortKeys.find((candidate) => candidate === key);
  return sortKey ? { key: sortKey, isDescending } : defaultSort;
}

export type SearchParams = Record<string, string | string[] | undefined>;

export function readSearchParam(
  searchParams: SearchParams,
  name: string,
): string | undefined {
  const value = searchParams[name];
  return Array.isArray(value) ? value[0] : value;
}

function parsePage(value: string | undefined): number {
  const pageNumber = Number(value);
  return Number.isInteger(pageNumber) && pageNumber >= FIRST_PAGE
    ? pageNumber
    : FIRST_PAGE;
}

export function parseListQuery<SortKey extends string>(
  searchParams: SearchParams,
  sortKeys: readonly SortKey[],
  defaultSort: ListSort<SortKey>,
): ListQuery<SortKey> {
  return {
    search: readSearchParam(searchParams, "buscar")?.trim() ?? "",
    sort: parseListSort(
      readSearchParam(searchParams, "orden"),
      sortKeys,
      defaultSort,
    ),
    page: parsePage(readSearchParam(searchParams, "pagina")),
  };
}

export const ROLE_SORT_KEYS = ["name", "permissions", "users"] as const;
export type RoleSortKey = (typeof ROLE_SORT_KEYS)[number];
export const DEFAULT_ROLE_SORT: ListSort<RoleSortKey> = {
  key: "name",
  isDescending: false,
};
export type RoleListQuery = ListQuery<RoleSortKey>;

export function parseRoleListQuery(searchParams: SearchParams): RoleListQuery {
  return parseListQuery(searchParams, ROLE_SORT_KEYS, DEFAULT_ROLE_SORT);
}

export const USER_SORT_KEYS = ["name", "email", "role"] as const;
export type UserSortKey = (typeof USER_SORT_KEYS)[number];
export const DEFAULT_USER_SORT: ListSort<UserSortKey> = {
  key: "name",
  isDescending: false,
};
export type UserListQuery = ListQuery<UserSortKey>;

export function parseUserListQuery(searchParams: SearchParams): UserListQuery {
  return parseListQuery(searchParams, USER_SORT_KEYS, DEFAULT_USER_SORT);
}

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

const PERSON_NAME_MIN_LENGTH = 2;
const PERSON_NAME_MAX_LENGTH = 120;

export const invitationInputSchema = z.object({
  name: z
    .string()
    .trim()
    .min(PERSON_NAME_MIN_LENGTH, {
      error: `El nombre debe tener al menos ${PERSON_NAME_MIN_LENGTH} caracteres.`,
    })
    .max(PERSON_NAME_MAX_LENGTH, {
      error: `El nombre no puede superar los ${PERSON_NAME_MAX_LENGTH} caracteres.`,
    }),
  email: z
    .email({ error: "El correo no es válido." })
    .transform((email) => email.toLowerCase()),
  roleId: z.uuid({ error: "Elegí un rol." }),
});

export type InvitationInput = z.input<typeof invitationInputSchema>;
export type ValidInvitationInput = z.output<typeof invitationInputSchema>;

export const invitationIdSchema = z.uuid({
  error: "La invitación no es válida.",
});
export const userIdSchema = z
  .string()
  .min(1, { error: "El usuario no es válido." });

export const MIN_REVOCATION_DAYS = 1;
export const MAX_REVOCATION_DAYS = 365;
export const REVOCATION_REASON_MIN_LENGTH = 5;
export const REVOCATION_REASON_MAX_LENGTH = 500;

export const accessRevocationSchema = z.object({
  duration: z.discriminatedUnion("kind", [
    z.object({ kind: z.literal("permanent") }),
    z.object({
      kind: z.literal("temporary"),
      days: z.coerce
        .number({ error: "Indicá la cantidad de días." })
        .int({ error: "Indicá días enteros." })
        .min(MIN_REVOCATION_DAYS, {
          error: `Indicá de ${MIN_REVOCATION_DAYS} a ${MAX_REVOCATION_DAYS} días.`,
        })
        .max(MAX_REVOCATION_DAYS, {
          error: `Indicá de ${MIN_REVOCATION_DAYS} a ${MAX_REVOCATION_DAYS} días.`,
        }),
    }),
  ]),
  reason: z
    .string()
    .trim()
    .min(REVOCATION_REASON_MIN_LENGTH, {
      error: `El motivo debe tener al menos ${REVOCATION_REASON_MIN_LENGTH} caracteres.`,
    })
    .max(REVOCATION_REASON_MAX_LENGTH, {
      error: `El motivo no puede superar los ${REVOCATION_REASON_MAX_LENGTH} caracteres.`,
    }),
});

export type AccessRevocationInput = z.input<typeof accessRevocationSchema>;
export type AccessRevocation = z.output<typeof accessRevocationSchema>;

export const newPasswordSchema = z
  .object({
    token: z.string().min(1, { error: "El enlace no es válido." }),
    password: z
      .string()
      .min(PASSWORD_MIN_LENGTH, {
        error: `La contraseña debe tener al menos ${PASSWORD_MIN_LENGTH} caracteres.`,
      })
      .max(PASSWORD_MAX_LENGTH, {
        error: `La contraseña no puede superar los ${PASSWORD_MAX_LENGTH} caracteres.`,
      }),
    passwordConfirmation: z.string(),
  })
  .refine((input) => input.password === input.passwordConfirmation, {
    error: "Las contraseñas no coinciden.",
    path: ["passwordConfirmation"],
  });

export type NewPasswordInput = z.input<typeof newPasswordSchema>;
