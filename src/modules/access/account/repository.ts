import { eq } from "drizzle-orm";

import type { DatabaseTransaction } from "@/platform/database/client";

import { users } from "../tables";

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
