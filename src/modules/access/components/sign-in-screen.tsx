import { UserCircle02Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import Image from "next/image";

import { ThemeToggle } from "@/components/shared/theme-toggle";

import { SignInForm } from "./sign-in-form";

const LOGO_ALTERNATIVE_TEXT = "Hospice Madre Teresa";
const LOGO_WIDTH = 600;
const LOGO_HEIGHT = 116;
const LOGO_CLASS_NAME = "mx-auto h-auto w-48";

const SIGN_IN_TITLE_ID = "sign-in-title";

export function SignInScreen() {
  return (
    <main className="relative flex min-h-dvh items-center justify-center bg-card px-4 py-16">
      <ThemeToggle className="absolute top-4 right-4 size-11" />
      <div className="w-full max-w-sm">
        <Image
          src="/hmt-logos/HMT-Logo-horizontal-azul.svg"
          alt={LOGO_ALTERNATIVE_TEXT}
          width={LOGO_WIDTH}
          height={LOGO_HEIGHT}
          preload
          className={`${LOGO_CLASS_NAME} dark:hidden`}
        />
        <Image
          src="/hmt-logos/HMT-Logo-horizontal-blanco.svg"
          alt={LOGO_ALTERNATIVE_TEXT}
          width={LOGO_WIDTH}
          height={LOGO_HEIGHT}
          className={`${LOGO_CLASS_NAME} hidden dark:block`}
        />

        <h1
          id={SIGN_IN_TITLE_ID}
          className="mt-12 text-center text-3xl font-semibold tracking-tight"
        >
          Iniciar sesión
        </h1>

        <span
          aria-hidden="true"
          className="mx-auto mt-8 mb-10 flex size-20 items-center justify-center rounded-full bg-primary/10 text-primary"
        >
          <HugeiconsIcon icon={UserCircle02Icon} className="size-12" />
        </span>

        <SignInForm labelledBy={SIGN_IN_TITLE_ID} />
      </div>
    </main>
  );
}
