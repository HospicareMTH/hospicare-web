import { unstable_rethrow } from "next/navigation";
import { toast } from "sonner";

import type { RoleActionResult } from "../actions";

const UNEXPECTED_ERROR_MESSAGE =
  "No pudimos guardar el cambio. Probá de nuevo en unos minutos.";

export async function runRoleAction(
  action: () => Promise<RoleActionResult>,
  successMessage: string,
): Promise<RoleActionResult | null> {
  let result: RoleActionResult;
  try {
    result = await action();
  } catch (error) {
    unstable_rethrow(error);
    console.error("La operación sobre el rol no pudo completarse.", error);
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
