import Link from "next/link";
import { Suspense } from "react";

import { Button } from "@/components/ui/button";

import { SIGN_IN_PATH } from "../../routes";

import { readSearchParam, type SearchParams } from "@/platform/list-query";

import { INVITATION_REJECTION_MESSAGES, previewInvitation } from "../service";
import { AcceptInvitationForm } from "./accept-invitation-form";

import { LoadingStatus } from "@/components/shared/loading-status";

import { PublicPageFrame } from "../../auth/components/public-page-frame";
import { PUBLIC_PRIMARY_BUTTON_CLASS_NAME } from "../../auth/components/public-styles";

const TITLE_ID = "accept-invitation-title";

async function AcceptInvitationContent({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const token = readSearchParam(await searchParams, "token") ?? "";
  const invitation = token
    ? await previewInvitation(token)
    : { status: "invalid" as const };

  if (invitation.status === "invalid") {
    return (
      <>
        <p className="mt-8 text-center text-base text-foreground">
          {INVITATION_REJECTION_MESSAGES.invalidLink}
        </p>
        <Button asChild className={PUBLIC_PRIMARY_BUTTON_CLASS_NAME}>
          <Link href={SIGN_IN_PATH}>Ir al inicio de sesión</Link>
        </Button>
      </>
    );
  }

  return (
    <>
      <dl className="mt-8 mb-8 grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-base">
        <dt className="text-muted-foreground">Nombre</dt>
        <dd className="font-medium">{invitation.name}</dd>
        <dt className="text-muted-foreground">Correo</dt>
        <dd className="font-medium break-all">{invitation.email}</dd>
        <dt className="text-muted-foreground">Rol</dt>
        <dd className="font-medium">{invitation.roleName}</dd>
      </dl>
      <AcceptInvitationForm
        token={token}
        email={invitation.email}
        labelledBy={TITLE_ID}
      />
    </>
  );
}

export function AcceptInvitationScreen({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  return (
    <PublicPageFrame title="Creá tu contraseña" titleId={TITLE_ID}>
      <Suspense
        fallback={
          <div className="mt-8 text-center">
            <LoadingStatus label="Revisando la invitación…" />
          </div>
        }
      >
        <AcceptInvitationContent searchParams={searchParams} />
      </Suspense>
    </PublicPageFrame>
  );
}
