import Link from "next/link";
import { Suspense } from "react";

import { Button } from "@/components/ui/button";

import { PASSWORD_RECOVERY_PATH } from "../routes";
import { readSearchParam, type SearchParams } from "../schemas";
import { LoadingStatus } from "./loading-status";
import { PasswordResetForm } from "./password-reset-form";
import { PASSWORD_RESET_MESSAGES } from "./password-reset-messages";
import { PublicPageFrame } from "./public-page-frame";
import { PUBLIC_PRIMARY_BUTTON_CLASS_NAME } from "./styles";

const TITLE_ID = "password-reset-title";

async function PasswordResetContent({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const parameters = await searchParams;
  const token = readSearchParam(parameters, "token");
  const hasLinkError = readSearchParam(parameters, "error") !== undefined;

  if (!token || hasLinkError) {
    return (
      <>
        <p className="mt-8 text-center text-base text-foreground">
          {PASSWORD_RESET_MESSAGES.invalidLink}
        </p>
        <Button asChild className={PUBLIC_PRIMARY_BUTTON_CLASS_NAME}>
          <Link href={PASSWORD_RECOVERY_PATH}>Pedir un enlace nuevo</Link>
        </Button>
      </>
    );
  }

  return <PasswordResetForm token={token} labelledBy={TITLE_ID} />;
}

export function PasswordResetScreen({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  return (
    <PublicPageFrame title="Creá una contraseña nueva" titleId={TITLE_ID}>
      <Suspense
        fallback={
          <div className="mt-8 text-center">
            <LoadingStatus label="Revisando el enlace…" />
          </div>
        }
      >
        <PasswordResetContent searchParams={searchParams} />
      </Suspense>
    </PublicPageFrame>
  );
}
