import { Suspense } from "react";

import { LoadingStatus } from "@/components/shared/loading-status";
import { hasPermission, requirePermission } from "@/modules/access";
import { formatDateTime } from "@/platform/dates";

import {
  getClinicalRecordNumberSetting,
  getDailyEvolutionEditWindowSetting,
  type SettingModification,
} from "../service";
import { ClinicalRecordNumberForm } from "./clinical-record-number-form";
import { DailyEvolutionEditWindowForm } from "./daily-evolution-edit-window-form";

function LastModification({
  modification,
}: {
  modification: SettingModification | null;
}) {
  if (!modification) {
    return null;
  }
  return (
    <p className="text-sm text-muted-foreground">
      Última modificación: {modification.modifiedByName},{" "}
      {formatDateTime(modification.modifiedAt)}
    </p>
  );
}

async function SystemSettingsContent() {
  const { access } = await requirePermission("admin.system_settings.view");
  const canUpdate = hasPermission(access, "admin.system_settings.update");
  const [clinicalRecordNumber, editWindow] = await Promise.all([
    getClinicalRecordNumberSetting(),
    getDailyEvolutionEditWindowSetting(),
  ]);

  return (
    <div className="flex flex-col gap-10">
      <section
        aria-labelledby="clinical-record-number-title"
        className="flex flex-col gap-4"
      >
        <h2 id="clinical-record-number-title" className="text-lg font-semibold">
          Número de historia clínica
        </h2>
        <ClinicalRecordNumberForm
          lastAssignedNumber={clinicalRecordNumber.lastAssignedNumber}
          canUpdate={canUpdate}
        />
        <LastModification
          modification={clinicalRecordNumber.lastModification}
        />
      </section>
      <section
        aria-labelledby="daily-evolution-edit-window-title"
        className="flex flex-col gap-4 border-t pt-8"
      >
        <h2
          id="daily-evolution-edit-window-title"
          className="text-lg font-semibold"
        >
          Ventana de edición de evoluciones diarias
        </h2>
        <p className="max-w-prose text-base text-muted-foreground">
          Cuánto tiempo después de registrarla su autor puede corregirla o
          anularla. Vale para las evoluciones que se registren desde ahora.
        </p>
        <DailyEvolutionEditWindowForm
          key={JSON.stringify(editWindow.window)}
          editWindow={editWindow.window}
          canUpdate={canUpdate}
        />
        <LastModification modification={editWindow.lastModification} />
      </section>
    </div>
  );
}

export function SystemSettingsScreen() {
  return (
    <Suspense fallback={<LoadingStatus label="Cargando configuración…" />}>
      <SystemSettingsContent />
    </Suspense>
  );
}
