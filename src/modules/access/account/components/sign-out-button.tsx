"use client";

import { Logout01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

import { DIALOG_BUTTON_CLASS_NAME } from "@/components/shared/form-styles";
import { Button } from "@/components/ui/button";

import { authClient } from "../../auth/auth-client";
import { SIGN_IN_PATH } from "../../routes";

const SIGN_OUT_ERROR_MESSAGE = "No pudimos cerrar la sesión. Probá de nuevo.";

export function SignOutButton() {
  const router = useRouter();
  const [isSigningOut, setIsSigningOut] = useState(false);

  async function signOut() {
    setIsSigningOut(true);
    try {
      const { error } = await authClient.signOut();
      if (error) {
        toast.error(SIGN_OUT_ERROR_MESSAGE);
        setIsSigningOut(false);
        return;
      }
    } catch (error) {
      console.error("El cierre de sesión no pudo completarse.", error);
      toast.error(SIGN_OUT_ERROR_MESSAGE);
      setIsSigningOut(false);
      return;
    }

    router.replace(SIGN_IN_PATH);
    router.refresh();
  }

  return (
    <Button
      type="button"
      variant="outline"
      onClick={signOut}
      disabled={isSigningOut}
      aria-busy={isSigningOut}
      className={`${DIALOG_BUTTON_CLASS_NAME} self-start`}
    >
      <HugeiconsIcon
        icon={Logout01Icon}
        data-icon="inline-start"
        aria-hidden="true"
      />
      {isSigningOut ? "Cerrando sesión…" : "Cerrar sesión"}
    </Button>
  );
}
