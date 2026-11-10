import { UserCircle02Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";

import { PublicPageFrame } from "./public-page-frame";
import { SignInForm } from "./sign-in-form";

const SIGN_IN_TITLE_ID = "sign-in-title";

export function SignInScreen() {
  return (
    <PublicPageFrame title="Iniciar sesión" titleId={SIGN_IN_TITLE_ID}>
      <span
        aria-hidden="true"
        className="mx-auto mt-8 mb-10 flex size-20 items-center justify-center rounded-full bg-primary/10 text-primary"
      >
        <HugeiconsIcon icon={UserCircle02Icon} className="size-12" />
      </span>

      <SignInForm labelledBy={SIGN_IN_TITLE_ID} />
    </PublicPageFrame>
  );
}
