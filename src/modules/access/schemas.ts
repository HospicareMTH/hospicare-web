import { z } from "zod";

import { ALL_PERMISSIONS } from "./permissions";

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

export const ROLE_SORT_KEYS = ["name", "permissions", "users"] as const;
export type RoleSortKey = (typeof ROLE_SORT_KEYS)[number];
export type RoleSort = { key: RoleSortKey; isDescending: boolean };

const DESCENDING_PREFIX = "-";
const DEFAULT_ROLE_SORT: RoleSort = { key: "name", isDescending: false };

export function parseRoleSort(value: string | undefined): RoleSort {
  const isDescending = value?.startsWith(DESCENDING_PREFIX) ?? false;
  const key = isDescending ? value?.slice(DESCENDING_PREFIX.length) : value;
  const sortKey = ROLE_SORT_KEYS.find((candidate) => candidate === key);
  return sortKey ? { key: sortKey, isDescending } : DEFAULT_ROLE_SORT;
}

export function formatRoleSort({ key, isDescending }: RoleSort): string {
  return isDescending ? `${DESCENDING_PREFIX}${key}` : key;
}

const firstValue = z
  .union([z.string(), z.array(z.string())])
  .optional()
  .transform((value) => (Array.isArray(value) ? value[0] : value));

export const roleListQuerySchema = z.object({
  buscar: firstValue.transform((search) => search?.trim() ?? ""),
  orden: firstValue.transform(parseRoleSort),
  pagina: firstValue.transform((page) => {
    const pageNumber = Number(page);
    return Number.isInteger(pageNumber) && pageNumber >= 1 ? pageNumber : 1;
  }),
});

export type RoleListQuery = {
  search: string;
  sort: RoleSort;
  page: number;
};

export function parseRoleListQuery(
  searchParams: Record<string, string | string[] | undefined>,
): RoleListQuery {
  const { buscar, orden, pagina } = roleListQuerySchema.parse(searchParams);
  return { search: buscar, sort: orden, page: pagina };
}
