import { Suspense } from "react";

import { LoadingStatus } from "@/components/shared/loading-status";
import { hasPermission, requirePermission } from "@/modules/access";
import { formatDateTime } from "@/platform/dates";

import { getClinicalRecordNumberSetting } from "../service";
import { ClinicalRecordNumberForm } from "./clinical-record-number-form";

async function SystemSettingsContent() {
  const { access } = await requirePermission("admin.system_settings.view");
  const { lastAssignedNumber, lastModification } =
    await getClinicalRecordNumberSetting();

  return (
    <section
      aria-labelledby="clinical-record-number-title"
      className="flex flex-col gap-4"
    >
      <h2 id="clinical-record-number-title" className="text-lg font-semibold">
        Número de historia clínica
      </h2>
      <ClinicalRecordNumberForm
        lastAssignedNumber={lastAssignedNumber}
        canUpdate={hasPermission(access, "admin.system_settings.update")}
      />
      {lastModification ? (
        <p className="text-sm text-muted-foreground">
          Última modificación: {lastModification.modifiedByName},{" "}
          {formatDateTime(lastModification.modifiedAt)}
        </p>
      ) : null}
    </section>
  );
}

export function SystemSettingsScreen() {
  return (
    <Suspense fallback={<LoadingStatus label="Cargando configuración…" />}>
      <SystemSettingsContent />
    </Suspense>
  );
}
