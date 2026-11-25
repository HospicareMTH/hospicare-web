import { AlertCircleIcon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";

import { DIALOG_BUTTON_CLASS_NAME } from "@/components/shared/form-styles";
import { LoadingStatus } from "@/components/shared/loading-status";
import { GUESTS_DESTINATION } from "@/components/shared/navigation";
import { SectionSheet } from "@/components/shared/section-sheet";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { requirePermission } from "@/modules/access";
import { getBusinessDate } from "@/platform/dates";

import { buildGuestPath } from "../schemas";
import {
  findGuestToEdit,
  GUEST_REJECTION_MESSAGES,
  loadGuestCatalogFields,
} from "../service";
import { GuestForm } from "./guest-form";

const EDIT_TITLE = "Editar huésped";

async function EditGuestContent({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { access } = await requirePermission("guests.records.update");
  const { id } = await params;
  const guest = await findGuestToEdit(id);
  if (!guest) {
    notFound();
  }
  if (guest.isAnnulled) {
    return (
      <SectionSheet destination={GUESTS_DESTINATION} title={EDIT_TITLE}>
        <Alert>
          <HugeiconsIcon icon={AlertCircleIcon} aria-hidden="true" />
          <AlertDescription className="text-base">
            {GUEST_REJECTION_MESSAGES.annulled}
          </AlertDescription>
        </Alert>
        <div>
          <Button
            asChild
            variant="outline"
            className={DIALOG_BUTTON_CLASS_NAME}
          >
            <Link href={buildGuestPath(guest.id)}>Ver el huésped</Link>
          </Button>
        </div>
      </SectionSheet>
    );
  }
  const catalogFields = await loadGuestCatalogFields(
    access,
    guest.savedSelections,
  );

  return (
    <SectionSheet destination={GUESTS_DESTINATION} title={EDIT_TITLE}>
      <GuestForm
        mode={{ kind: "edit", guestId: guest.id, version: guest.version }}
        initialGuest={guest.details}
        catalogFields={catalogFields}
        today={getBusinessDate(new Date())}
      />
    </SectionSheet>
  );
}

export function EditGuestScreen({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  return (
    <Suspense
      fallback={
        <SectionSheet destination={GUESTS_DESTINATION} title={EDIT_TITLE}>
          <LoadingStatus label="Cargando el huésped…" />
        </SectionSheet>
      }
    >
      <EditGuestContent params={params} />
    </Suspense>
  );
}
