import { insertAuditEntry } from "./repository";

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
