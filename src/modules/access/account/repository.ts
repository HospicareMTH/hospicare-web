import { and, eq } from "drizzle-orm";

import {
  type DatabaseTransaction,
  getDatabase,
} from "@/platform/database/client";

import { tableColumnPreferences, users } from "../tables";

export async function lockUserEmailVerification(
  transaction: DatabaseTransaction,
  userId: string,
): Promise<boolean | null> {
  const [user] = await transaction
    .select({ emailVerified: users.emailVerified })
    .from(users)
    .where(eq(users.id, userId))
    .for("update");
  return user?.emailVerified ?? null;
}

export async function updateUserName(
  transaction: DatabaseTransaction,
  userId: string,
  name: string,
): Promise<void> {
  await transaction
    .update(users)
    .set({ name, updatedAt: new Date() })
    .where(eq(users.id, userId));
}

export async function findHiddenColumns(
  userId: string,
  tableKey: string,
): Promise<string[]> {
  const [preference] = await getDatabase()
    .select({ hiddenColumns: tableColumnPreferences.hiddenColumns })
    .from(tableColumnPreferences)
    .where(
      and(
        eq(tableColumnPreferences.userId, userId),
        eq(tableColumnPreferences.tableKey, tableKey),
      ),
    );
  return preference?.hiddenColumns ?? [];
}

export async function upsertHiddenColumns(
  transaction: DatabaseTransaction,
  userId: string,
  tableKey: string,
  hiddenColumns: string[],
): Promise<void> {
  await transaction
    .insert(tableColumnPreferences)
    .values({ userId, tableKey, hiddenColumns })
    .onConflictDoUpdate({
      target: [tableColumnPreferences.userId, tableColumnPreferences.tableKey],
      set: { hiddenColumns, updatedAt: new Date() },
    });
}
