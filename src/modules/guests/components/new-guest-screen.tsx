import { Suspense } from "react";

import { LoadingStatus } from "@/components/shared/loading-status";
import { requirePermission } from "@/modules/access";
import { getBusinessDate } from "@/platform/dates";

import { buildEmptyGuest } from "../schemas";
import { loadGuestCatalogFields } from "../service";
import { GuestForm } from "./guest-form";

async function NewGuestContent() {
  const { access } = await requirePermission("guests.records.manual_create");
  const catalogFields = await loadGuestCatalogFields(access);
  const today = getBusinessDate(new Date());

  return (
    <GuestForm
      mode={{ kind: "create" }}
      initialGuest={buildEmptyGuest(today)}
      catalogFields={catalogFields}
      today={today}
    />
  );
}

export function NewGuestScreen() {
  return (
    <Suspense fallback={<LoadingStatus label="Cargando el formulario…" />}>
      <NewGuestContent />
    </Suspense>
  );
}
