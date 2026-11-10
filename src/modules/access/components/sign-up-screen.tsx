import Link from "next/link";

import { Button } from "@/components/ui/button";

import { SIGN_IN_PATH } from "../routes";
import { PublicPageFrame } from "./public-page-frame";
import { PUBLIC_PRIMARY_BUTTON_CLASS_NAME } from "./styles";

export function SignUpScreen() {
  return (
    <PublicPageFrame title="Registro" titleId="sign-up-title">
      <p className="mt-8 text-center text-base text-foreground">
        El alta en Hospicare es solo por invitación. Si necesitás acceso,
        pedíselo a un administrador.
      </p>
      <Button asChild className={PUBLIC_PRIMARY_BUTTON_CLASS_NAME}>
        <Link href={SIGN_IN_PATH}>Iniciar sesión</Link>
      </Button>
    </PublicPageFrame>
  );
}
