import { z } from "zod";

import {
  type ListQuery,
  type ListSort,
  parseListQuery,
  type SearchParams,
} from "@/platform/list-query";

import { ALL_PERMISSIONS } from "../permissions";

const ROLE_NAME_MIN_LENGTH = 2;

export const ROLE_NAME_MAX_LENGTH = 80;

export const ROLE_DESCRIPTION_MAX_LENGTH = 500;

export const roleIdSchema = z.uuid({ error: "El rol no es válido." });

export const roleSelectionSchema = z.uuid({ error: "Elegí un rol." });

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

export const ROLES_TABLE_KEY = "roles";

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
