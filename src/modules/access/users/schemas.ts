import { z } from "zod";

import {
  type ListQuery,
  type ListSort,
  parseListQuery,
  type SearchParams,
} from "@/platform/list-query";

import {
  emailSchema,
  hasMatchingConfirmation,
  passwordMismatch,
  passwordSchema,
  personNameSchema,
} from "../schemas";
import { roleSelectionSchema } from "../roles/schemas";

const NAME_MIN_LENGTH = 2;

export const superUserInputSchema = z.object({
  name: z
    .string()
    .trim()
    .min(NAME_MIN_LENGTH, {
      error: `El nombre debe tener al menos ${NAME_MIN_LENGTH} caracteres.`,
    }),
  email: emailSchema,
  password: passwordSchema,
});

export type SuperUserInput = z.input<typeof superUserInputSchema>;

export const USERS_TABLE_KEY = "users";

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

export const userCreationSchema = z
  .object({
    name: personNameSchema,
    email: emailSchema,
    roleId: roleSelectionSchema,
    password: passwordSchema,
    passwordConfirmation: z.string(),
    isEmailVerified: z.boolean(),
  })
  .refine(hasMatchingConfirmation, passwordMismatch);

export type UserCreationInput = z.input<typeof userCreationSchema>;

export type ValidUserCreationInput = z.output<typeof userCreationSchema>;
