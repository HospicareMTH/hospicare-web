import { Mail01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import Link from "next/link";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";

import { ACCOUNT_PATH } from "../../routes";
import { requireSession } from "../../auth/session";

export async function EmailVerificationNotice() {
  const { user } = await requireSession();
  if (user.emailVerified) {
    return null;
  }

  return (
    <Alert className="px-4 py-3">
      <HugeiconsIcon
        icon={Mail01Icon}
        className="size-5 text-primary"
        aria-hidden="true"
      />
      <AlertTitle className="text-base font-normal">
        Verificá tu correo para poder activar el segundo factor.
      </AlertTitle>
      <AlertDescription>
        <Button asChild className="mt-2 h-10 px-4 text-base">
          <Link href={ACCOUNT_PATH}>Verificar mi correo</Link>
        </Button>
      </AlertDescription>
    </Alert>
  );
}
