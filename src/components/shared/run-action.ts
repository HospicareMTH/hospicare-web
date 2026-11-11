import { unstable_rethrow } from "next/navigation";
import { toast } from "sonner";

import type { ActionResult } from "@/platform/operation-result";

const UNEXPECTED_ERROR_MESSAGE =
  "No pudimos guardar el cambio. Probá de nuevo en unos minutos.";

export async function runAction(
  action: () => Promise<ActionResult>,
  successMessage: string,
): Promise<ActionResult | null> {
  let result: ActionResult;
  try {
    result = await action();
  } catch (error) {
    unstable_rethrow(error);
    console.error("La operación no pudo completarse.", error);
    toast.error(UNEXPECTED_ERROR_MESSAGE);
    return null;
  }

  if (result.status === "success") {
    toast.success(successMessage);
  }
  if (result.status === "rejected") {
    toast.error(result.message);
  }
  return result;
}
