import { hashPassword } from "better-auth/crypto";

import { recordFailedSignIn } from "@/modules/audit";
import { runInTransaction } from "@/platform/database/client";

import {
  findUserIdByEmail,
  hasUserWithRole,
  insertUserWithPassword,
  isEmailRegistered,
  lockSystemRole,
  SUPER_USER_SYSTEM_KEY,
} from "./repository";
import {
  type SuperUserInput,
  signInRequestBodySchema,
  superUserInputSchema,
} from "./schemas";

export const CLIENT_IP_HEADER = "cf-connecting-ip";
const USER_AGENT_HEADER = "user-agent";

export type FirstSuperUserResult =
  "created" | "super-user-already-exists" | "email-already-registered";

export async function createFirstSuperUser(
  input: SuperUserInput,
): Promise<FirstSuperUserResult> {
  const { name, email, password } = superUserInputSchema.parse(input);
  const passwordHash = await hashPassword(password);

  return runInTransaction(async (transaction) => {
    const superUserRoleId = await lockSystemRole(
      transaction,
      SUPER_USER_SYSTEM_KEY,
    );
    if (!superUserRoleId) {
      throw new Error(
        "Falta el rol Super user en la base: aplicá las migraciones.",
      );
    }
    if (await hasUserWithRole(transaction, superUserRoleId)) {
      return "super-user-already-exists";
    }
    if (await isEmailRegistered(transaction, email)) {
      return "email-already-registered";
    }

    await insertUserWithPassword(transaction, {
      name,
      email,
      passwordHash,
      roleId: superUserRoleId,
    });
    return "created";
  });
}

type SignInAttempt = {
  body: unknown;
  headers: Headers | undefined;
};

export async function recordFailedSignInAttempt({
  body,
  headers,
}: SignInAttempt): Promise<void> {
  const parsedBody = signInRequestBodySchema.safeParse(body);
  const targetUserId = parsedBody.success
    ? await findUserIdByEmail(parsedBody.data.email.toLowerCase())
    : null;

  await recordFailedSignIn({
    targetUserId,
    ipAddress: headers?.get(CLIENT_IP_HEADER) ?? null,
    userAgent: headers?.get(USER_AGENT_HEADER) ?? null,
  });
}
