import { eq } from "drizzle-orm";

import { getDatabase } from "@/platform/database/client";

import { users } from "../tables";

export async function findUserIdByEmail(email: string): Promise<string | null> {
  const [user] = await getDatabase()
    .select({ id: users.id })
    .from(users)
    .where(eq(users.email, email))
    .limit(1);
  return user?.id ?? null;
}

export type AccessRevocationRecord = {
  accessRevokedAt: Date | null;
  accessRevokedUntil: Date | null;
};

export async function findAccessRevocation(
  userId: string,
): Promise<AccessRevocationRecord | null> {
  const [user] = await getDatabase()
    .select({
      accessRevokedAt: users.accessRevokedAt,
      accessRevokedUntil: users.accessRevokedUntil,
    })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);
  return user ?? null;
}
