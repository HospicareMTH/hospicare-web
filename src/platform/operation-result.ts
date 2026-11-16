import { refresh } from "next/cache";
import { z } from "zod";

export type RejectedOperation = { status: "rejected"; message: string };

export type OperationResult = { status: "success" } | RejectedOperation;

export const SUCCESS: OperationResult = { status: "success" };

export function reject(message: string): RejectedOperation {
  return { status: "rejected", message };
}

export type ActionResult =
  | OperationResult
  | { status: "invalid"; fieldErrors: Record<string, string[] | undefined> };

export type FailedActionResult = Exclude<ActionResult, { status: "success" }>;

export function toInvalidResult(error: z.ZodError): FailedActionResult {
  return { status: "invalid", fieldErrors: z.flattenError(error).fieldErrors };
}

const INVALID_REQUEST_MESSAGE =
  "El pedido no es válido. Actualizá la pantalla.";

export function toRejectedResult(error: z.ZodError): FailedActionResult {
  return {
    status: "rejected",
    message: error.issues[0]?.message ?? INVALID_REQUEST_MESSAGE,
  };
}

export function refreshOnSuccess(result: OperationResult): OperationResult {
  if (result.status === "success") {
    refresh();
  }
  return result;
}
