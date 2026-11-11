import {
  bigint,
  index,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
} from "drizzle-orm/pg-core";

export const auditOperation = pgEnum("audit_operation", [
  "create",
  "update",
  "delete",
  "access",
  "session",
  "security",
]);

export const auditStatus = pgEnum("audit_status", ["success", "failure"]);

export const auditLog = pgTable(
  "audit_log",
  {
    id: bigint({ mode: "number" }).primaryKey().generatedAlwaysAsIdentity(),
    occurredAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
    action: text().notNull(),
    operation: auditOperation().notNull(),
    resource: text().notNull(),
    resourceId: text(),
    actorUserId: text(),
    targetUserId: text(),
    status: auditStatus().notNull(),
    previousValue: jsonb(),
    newValue: jsonb(),
    details: jsonb(),
    ipAddress: text(),
    userAgent: text(),
  },
  (table) => [index().on(table.occurredAt), index().on(table.targetUserId)],
);
