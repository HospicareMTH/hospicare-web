import QRCode from "qrcode";

import {
  type OperationResult,
  reject,
  SUCCESS,
} from "@/platform/operation-result";
import { runInTransactionAs } from "@/platform/database/client";

import {
  findHiddenColumns,
  lockUserEmailVerification,
  updateUserName,
  upsertHiddenColumns,
} from "./repository";
import type { ColumnPreference } from "./schemas";

export const ACCOUNT_REJECTION_MESSAGES = {
  userNotFound: "Tu cuenta ya no existe. Volvé a iniciar sesión.",
  emailNotVerified: "Verificá tu correo para hacer esta acción.",
} as const;

export async function renderTotpQrCode(totpUri: string): Promise<string> {
  const svg = await QRCode.toString(totpUri, { type: "svg", margin: 1 });
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

export async function updateOwnName(
  userId: string,
  name: string,
): Promise<OperationResult> {
  return runInTransactionAs(userId, async (transaction) => {
    const isEmailVerified = await lockUserEmailVerification(
      transaction,
      userId,
    );
    if (isEmailVerified === null) {
      return reject(ACCOUNT_REJECTION_MESSAGES.userNotFound);
    }
    if (!isEmailVerified) {
      return reject(ACCOUNT_REJECTION_MESSAGES.emailNotVerified);
    }
    await updateUserName(transaction, userId, name);
    return SUCCESS;
  });
}

export function getHiddenColumns(
  userId: string,
  tableKey: string,
): Promise<string[]> {
  return findHiddenColumns(userId, tableKey);
}

export async function saveHiddenColumns(
  userId: string,
  { tableKey, hiddenColumns }: ColumnPreference,
): Promise<OperationResult> {
  await runInTransactionAs(userId, (transaction) =>
    upsertHiddenColumns(transaction, userId, tableKey, hiddenColumns),
  );
  return SUCCESS;
}
