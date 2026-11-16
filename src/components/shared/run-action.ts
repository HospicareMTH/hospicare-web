import { unstable_rethrow } from "next/navigation";
import { toast } from "sonner";

import type { ActionResult } from "@/platform/operation-result";

const UNEXPECTED_ERROR_MESSAGE =
  "No pudimos guardar el cambio. Probá de nuevo en unos minutos.";

type SuccessResult<Result extends ActionResult> = Extract<
  Result,
  { status: "success" }
>;

function isSuccess<Result extends ActionResult>(
  result: Result,
): result is SuccessResult<Result> {
  return result.status === "success";
}

export async function runAction<Result extends ActionResult>(
  action: () => Promise<Result>,
  successMessage: string | ((result: SuccessResult<Result>) => string),
): Promise<Result | null> {
  let result: Result;
  try {
    result = await action();
  } catch (error) {
    unstable_rethrow(error);
    console.error("La operación no pudo completarse.", error);
    toast.error(UNEXPECTED_ERROR_MESSAGE);
    return null;
  }

  if (isSuccess(result)) {
    toast.success(
      typeof successMessage === "string"
        ? successMessage
        : successMessage(result),
    );
  }
  if (result.status === "rejected") {
    toast.error(result.message);
  }
  return result;
}
