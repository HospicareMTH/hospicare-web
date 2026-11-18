import type { DatabaseTransaction } from "@/platform/database/client";

import {
  type AuditEntryRecord,
  type AuditEntrySearch,
  countAuditEntryRecords,
  countAuditEntryRecordsSince,
  insertAuditEntry,
  insertAuditEntryInTransaction,
  listAuditEntryRecords,
} from "./repository";

export function countAuditEntries(search: AuditEntrySearch): Promise<number> {
  return countAuditEntryRecords(search);
}

export function countAuditEntriesSince(windowStart: Date): Promise<number> {
  return countAuditEntryRecordsSince(windowStart);
}

export function listAuditEntries(
  search: AuditEntrySearch,
  window: { offset: number; limit: number },
): Promise<AuditEntryRecord[]> {
  return listAuditEntryRecords(search, window);
}

export const FAILED_SIGN_IN_ACTION = "session.sign_in_failed";

type FailedSignIn = {
  targetUserId: string | null;
  ipAddress: string | null;
  userAgent: string | null;
};

export async function recordFailedSignIn({
  targetUserId,
  ipAddress,
  userAgent,
}: FailedSignIn): Promise<void> {
  await insertAuditEntry({
    action: FAILED_SIGN_IN_ACTION,
    operation: "session",
    resource: "session",
    actorUserId: null,
    targetUserId,
    status: "failure",
    ipAddress,
    userAgent,
  });
}

export const ROLE_PERMISSIONS_UPDATED_ACTION = "role.permissions_updated";

type RolePermissionsChange = {
  roleId: string;
  actorUserId: string;
  previousPermissions: readonly string[];
  nextPermissions: readonly string[];
};

function sortPermissions(permissions: readonly string[]): string[] {
  return [...permissions].sort();
}

export async function recordRolePermissionsChange(
  transaction: DatabaseTransaction,
  {
    roleId,
    actorUserId,
    previousPermissions,
    nextPermissions,
  }: RolePermissionsChange,
): Promise<void> {
  await insertAuditEntryInTransaction(transaction, {
    action: ROLE_PERMISSIONS_UPDATED_ACTION,
    operation: "update",
    resource: "role",
    resourceId: roleId,
    actorUserId,
    status: "success",
    previousValue: { permissions: sortPermissions(previousPermissions) },
    newValue: { permissions: sortPermissions(nextPermissions) },
  });
}
