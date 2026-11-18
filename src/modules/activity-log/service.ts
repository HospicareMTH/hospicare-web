import {
  findUserIdsByName,
  findUserNames,
  hasPermission,
  type UserAccess,
} from "@/modules/access";
import {
  type AuditEntryRecord,
  type AuditEntrySearch,
  type AuditEntryTextMatch,
  type AuditStatus,
  countAuditEntries,
  listAuditEntries,
} from "@/modules/audit";
import { type ListPage, resolvePageWindow } from "@/platform/list-query";

import {
  findActionsWithLabelContaining,
  isSystemActorMatching,
  labelAction,
  labelResource,
  OPERATION_LABELS,
  STATUS_LABELS,
  SYSTEM_ACTOR_LABEL,
} from "./labels";
import type { ActivityLogListQuery } from "./schemas";

export type ActivityLogEntry = {
  id: string;
  occurredAt: Date;
  actionLabel: string;
  operationLabel: string;
  resourceLabel: string;
  actorName: string;
  targetUserName: string | null;
  status: AuditStatus;
  statusLabel: string;
  ipAddress: string | null;
  userAgent: string | null;
};

export type ActivityLogList = ListPage<ActivityLogEntry>;

async function buildTextMatch(
  searchTerm: string,
): Promise<AuditEntryTextMatch | null> {
  if (!searchTerm) {
    return null;
  }
  return {
    actions: findActionsWithLabelContaining(searchTerm),
    actorUserIds: await findUserIdsByName(searchTerm),
    includesEntriesWithoutActor: isSystemActorMatching(searchTerm),
  };
}

function toActivityLogEntry(
  record: AuditEntryRecord,
  userNames: ReadonlyMap<string, string>,
): ActivityLogEntry {
  return {
    id: String(record.id),
    occurredAt: record.occurredAt,
    actionLabel: labelAction(record.action, record.resource, record.operation),
    operationLabel: OPERATION_LABELS[record.operation],
    resourceLabel: labelResource(record.resource),
    actorName:
      (record.actorUserId && userNames.get(record.actorUserId)) ||
      SYSTEM_ACTOR_LABEL,
    targetUserName: record.targetUserId
      ? (userNames.get(record.targetUserId) ?? null)
      : null,
    status: record.status,
    statusLabel: STATUS_LABELS[record.status],
    ipAddress: record.ipAddress,
    userAgent: record.userAgent,
  };
}

function collectUserIds(records: readonly AuditEntryRecord[]): string[] {
  return records.flatMap(({ actorUserId, targetUserId }) =>
    [actorUserId, targetUserId].filter((userId) => userId !== null),
  );
}

export async function searchActivityLog(
  access: UserAccess,
  query: ActivityLogListQuery,
): Promise<ActivityLogList | null> {
  if (!hasPermission(access, "admin.logs.view")) {
    return null;
  }
  const search: AuditEntrySearch = {
    textMatch: await buildTextMatch(query.search),
    operation: query.operation,
    resource: query.resource,
    isNewestFirst: query.sort.isDescending,
  };
  const totalCount = await countAuditEntries(search);
  const window = resolvePageWindow(totalCount, query.page, query.pageSize);
  const records = await listAuditEntries(search, {
    offset: window.offset,
    limit: query.pageSize,
  });
  const userNames = await findUserNames(collectUserIds(records));

  return {
    items: records.map((record) => toActivityLogEntry(record, userNames)),
    totalCount,
    page: window.page,
    pageCount: window.pageCount,
    pageSize: query.pageSize,
  };
}
