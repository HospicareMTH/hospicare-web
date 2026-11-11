import { sql } from "drizzle-orm";
import {
  type AnyPgColumn,
  bigint,
  boolean,
  index,
  integer,
  pgEnum,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

const createdAt = () =>
  timestamp({ withTimezone: true }).notNull().defaultNow();
const updatedAt = () =>
  timestamp({ withTimezone: true }).notNull().defaultNow();

export const users = pgTable("users", {
  id: text().primaryKey(),
  name: text().notNull(),
  email: text().notNull().unique(),
  emailVerified: boolean().notNull().default(false),
  image: text(),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
  accessRevokedAt: timestamp({ withTimezone: true }),
  accessRevokedUntil: timestamp({ withTimezone: true }),
  accessRevocationReason: text(),
  accessRevokedByUserId: text().references((): AnyPgColumn => users.id, {
    onDelete: "set null",
  }),
  twoFactorEnabled: boolean().notNull().default(false),
});

export const sessions = pgTable(
  "sessions",
  {
    id: text().primaryKey(),
    expiresAt: timestamp({ withTimezone: true }).notNull(),
    token: text().notNull().unique(),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
    ipAddress: text(),
    userAgent: text(),
    userId: text()
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
  },
  (table) => [index().on(table.userId)],
);

export const accounts = pgTable(
  "accounts",
  {
    id: text().primaryKey(),
    accountId: text().notNull(),
    providerId: text().notNull(),
    userId: text()
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    accessToken: text(),
    refreshToken: text(),
    idToken: text(),
    accessTokenExpiresAt: timestamp({ withTimezone: true }),
    refreshTokenExpiresAt: timestamp({ withTimezone: true }),
    scope: text(),
    password: text(),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (table) => [index().on(table.userId)],
);

export const verifications = pgTable(
  "verifications",
  {
    id: text().primaryKey(),
    identifier: text().notNull(),
    value: text().notNull(),
    expiresAt: timestamp({ withTimezone: true }).notNull(),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (table) => [index().on(table.identifier)],
);

export const twoFactors = pgTable(
  "two_factors",
  {
    id: text().primaryKey(),
    secret: text().notNull(),
    backupCodes: text().notNull(),
    userId: text()
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    verified: boolean().notNull().default(true),
    failedVerificationCount: integer().notNull().default(0),
    lockedUntil: timestamp({ withTimezone: true }),
  },
  (table) => [index().on(table.userId), index().on(table.secret)],
);

export const rateLimits = pgTable("rate_limits", {
  id: text().primaryKey(),
  key: text().notNull().unique(),
  count: integer().notNull(),
  lastRequest: bigint({ mode: "number" }).notNull(),
});

export const roles = pgTable(
  "roles",
  {
    id: uuid().primaryKey().defaultRandom(),
    systemKey: text().unique(),
    name: text().notNull(),
    description: text(),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (table) => [uniqueIndex("roles_name_unique").on(sql`lower(${table.name})`)],
);

export const rolePermissions = pgTable(
  "role_permissions",
  {
    roleId: uuid()
      .notNull()
      .references(() => roles.id, { onDelete: "cascade" }),
    permission: text().notNull(),
    createdAt: createdAt(),
  },
  (table) => [primaryKey({ columns: [table.roleId, table.permission] })],
);

export const userRoles = pgTable(
  "user_roles",
  {
    userId: text()
      .primaryKey()
      .references(() => users.id, { onDelete: "cascade" }),
    roleId: uuid()
      .notNull()
      .references(() => roles.id, { onDelete: "restrict" }),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (table) => [index().on(table.roleId)],
);

export const invitationStatus = pgEnum("invitation_status", [
  "pending",
  "accepted",
  "revoked",
]);

export const invitations = pgTable(
  "invitations",
  {
    id: uuid().primaryKey().defaultRandom(),
    email: text().notNull(),
    name: text().notNull(),
    roleId: uuid()
      .notNull()
      .references(() => roles.id, { onDelete: "restrict" }),
    tokenHash: text().notNull().unique(),
    status: invitationStatus().notNull().default("pending"),
    expiresAt: timestamp({ withTimezone: true }).notNull(),
    invitedByUserId: text().references(() => users.id, {
      onDelete: "set null",
    }),
    acceptedUserId: text().references(() => users.id, {
      onDelete: "set null",
    }),
    revokedAt: timestamp({ withTimezone: true }),
    revokedByUserId: text().references(() => users.id, {
      onDelete: "set null",
    }),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (table) => [index().on(table.email), index().on(table.roleId)],
);

export const tableColumnPreferences = pgTable(
  "table_column_preferences",
  {
    userId: text()
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    tableKey: text().notNull(),
    hiddenColumns: text()
      .array()
      .notNull()
      .default(sql`'{}'::text[]`),
    updatedAt: updatedAt(),
  },
  (table) => [primaryKey({ columns: [table.userId, table.tableKey] })],
);
