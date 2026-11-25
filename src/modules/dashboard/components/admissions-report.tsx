import { ADMISSIONS_DESTINATION } from "@/components/shared/navigation";

import { describeRate } from "../indicator-values";
import type { AdmissionsReportView } from "../service";
import {
  IndicatorReportSection,
  type ReportIndicator,
} from "./indicator-report-section";

const REPORT_TITLE_ID = "admissions-report-title";

function listIndicators(report: AdmissionsReportView): ReportIndicator[] {
  return [
    {
      label: `Entrevistas cargadas en los últimos ${report.windowDays} días`,
      value: report.createdInWindowCount,
    },
    {
      label: "Pasaron a huésped",
      value: describeRate(
        report.acceptedCount,
        report.activeCount,
        "Sin entrevistas",
      ),
    },
    { label: "Pendientes de decisión", value: report.pendingDecisionCount },
  ];
}

export function AdmissionsReportSection({
  report,
}: {
  report: AdmissionsReportView;
}) {
  return (
    <IndicatorReportSection
      titleId={REPORT_TITLE_ID}
      title="Admisiones"
      description="Entrevistas recientes, cuántas pasaron a huésped y cuántas esperan una decisión."
      link={
        report.canViewInterviews
          ? { href: ADMISSIONS_DESTINATION.href, label: "Ver entrevistas" }
          : null
      }
      indicators={listIndicators(report)}
    />
  );
}
