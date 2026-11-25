import { Analytics01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { Suspense } from "react";

import { LoadingStatus } from "@/components/shared/loading-status";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
} from "@/components/ui/empty";
import { getCurrentUser } from "@/modules/access";

import {
  getAccessesReportFor,
  getAdmissionsReportFor,
  getClinicalFollowUpReportFor,
  getDataQualityReport,
  getGuestsReportFor,
} from "../service";
import { AccessesReportSection } from "./accesses-report";
import { AdmissionsReportSection } from "./admissions-report";
import { ClinicalFollowUpReportSection } from "./clinical-follow-up-report";
import { DataQualityReportSection } from "./data-quality-report";
import { GuestsReportSection } from "./guests-report";

function NoReportsEmptyState() {
  return (
    <Empty className="flex-1 rounded-xl border border-dashed border-input/60">
      <EmptyHeader>
        <EmptyMedia
          variant="icon"
          className="size-12 rounded-full text-primary"
        >
          <HugeiconsIcon
            icon={Analytics01Icon}
            className="size-6"
            aria-hidden="true"
          />
        </EmptyMedia>
        <EmptyDescription className="text-base text-foreground">
          Todavía no hay reportes para mostrar.
        </EmptyDescription>
      </EmptyHeader>
    </Empty>
  );
}

async function DashboardReportsContent() {
  const { access } = await getCurrentUser();
  const [
    admissionsReport,
    guestsReport,
    clinicalFollowUpReport,
    dataQualityReport,
    accessesReport,
  ] = await Promise.all([
    getAdmissionsReportFor(access),
    getGuestsReportFor(access),
    getClinicalFollowUpReportFor(access),
    getDataQualityReport(access),
    getAccessesReportFor(access),
  ]);
  if (
    !admissionsReport &&
    !guestsReport &&
    !clinicalFollowUpReport &&
    !dataQualityReport &&
    !accessesReport
  ) {
    return <NoReportsEmptyState />;
  }
  return (
    <div className="flex flex-col gap-10">
      {admissionsReport && (
        <AdmissionsReportSection report={admissionsReport} />
      )}
      {guestsReport && <GuestsReportSection report={guestsReport} />}
      {clinicalFollowUpReport && (
        <ClinicalFollowUpReportSection report={clinicalFollowUpReport} />
      )}
      {dataQualityReport && (
        <DataQualityReportSection report={dataQualityReport} />
      )}
      {accessesReport && <AccessesReportSection report={accessesReport} />}
    </div>
  );
}

export function DashboardReports() {
  return (
    <Suspense fallback={<LoadingStatus label="Cargando reportes…" />}>
      <DashboardReportsContent />
    </Suspense>
  );
}
