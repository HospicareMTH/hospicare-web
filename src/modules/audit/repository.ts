import {
  and,
  asc,
  count,
  desc,
  eq,
  gte,
  inArray,
  isNull,
  or,
  type SQL,
  sql,
} from "drizzle-orm";

import {
  type DatabaseTransaction,
  getDatabase,
} from "@/platform/database/client";

import { type AuditOperation, type AuditStatus, auditLog } from "./tables";

export type NewAuditEntry = typeof auditLog.$inferInsert;

export async function insertAuditEntry(entry: NewAuditEntry): Promise<void> {
  await getDatabase().insert(auditLog).values(entry);
}

export async function insertAuditEntryInTransaction(
  transaction: DatabaseTransaction,
  entry: NewAuditEntry,
): Promise<void> {
  await transaction.insert(auditLog).values(entry);
}

export type AuditEntryTextMatch = {
  actions: readonly string[];
  actorUserIds: readonly string[];
  includesEntriesWithoutActor: boolean;
};

export type AuditEntrySearch = {
  textMatch: AuditEntryTextMatch | null;
  operation: AuditOperation | null;
  resource: string | null;
  isNewestFirst: boolean;
};

export type AuditEntryRecord = {
  id: number;
  occurredAt: Date;
  action: string;
  operation: AuditOperation;
  resource: string;
  actorUserId: string | null;
  targetUserId: string | null;
  status: AuditStatus;
  ipAddress: string | null;
  userAgent: string | null;
};

const LIST_COLUMNS = {
  id: auditLog.id,
  occurredAt: auditLog.occurredAt,
  action: auditLog.action,
  operation: auditLog.operation,
  resource: auditLog.resource,
  actorUserId: auditLog.actorUserId,
  targetUserId: auditLog.targetUserId,
  status: auditLog.status,
  ipAddress: auditLog.ipAddress,
  userAgent: auditLog.userAgent,
};

const MATCHES_NOTHING = sql`false`;

function buildTextMatchFilter({
  actions,
  actorUserIds,
  includesEntriesWithoutActor,
}: AuditEntryTextMatch): SQL {
  return (
    or(
      actions.length > 0 ? inArray(auditLog.action, [...actions]) : undefined,
      actorUserIds.length > 0
        ? inArray(auditLog.actorUserId, [...actorUserIds])
        : undefined,
      includesEntriesWithoutActor ? isNull(auditLog.actorUserId) : undefined,
    ) ?? MATCHES_NOTHING
  );
}

function buildListFilter({
  textMatch,
  operation,
  resource,
}: AuditEntrySearch): SQL | undefined {
  return and(
    textMatch ? buildTextMatchFilter(textMatch) : undefined,
    operation ? eq(auditLog.operation, operation) : undefined,
    resource ? eq(auditLog.resource, resource) : undefined,
  );
}

export async function countAuditEntryRecords(
  search: AuditEntrySearch,
): Promise<number> {
  const [result] = await getDatabase()
    .select({ total: count() })
    .from(auditLog)
    .where(buildListFilter(search));
  return result?.total ?? 0;
}

export async function countAuditEntryRecordsSince(
  windowStart: Date,
): Promise<number> {
  const [result] = await getDatabase()
    .select({ total: count() })
    .from(auditLog)
    .where(gte(auditLog.occurredAt, windowStart));
  return result?.total ?? 0;
}

export function listAuditEntryRecords(
  search: AuditEntrySearch,
  { offset, limit }: { offset: number; limit: number },
): Promise<AuditEntryRecord[]> {
  const direction = search.isNewestFirst ? desc : asc;
  return getDatabase()
    .select(LIST_COLUMNS)
    .from(auditLog)
    .where(buildListFilter(search))
    .orderBy(direction(auditLog.occurredAt), direction(auditLog.id))
    .offset(offset)
    .limit(limit);
}
