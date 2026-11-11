import { getDatabase } from "@/platform/database/client";

import { auditLog } from "./tables";

export type NewAuditEntry = typeof auditLog.$inferInsert;

export async function insertAuditEntry(entry: NewAuditEntry): Promise<void> {
  await getDatabase().insert(auditLog).values(entry);
}
