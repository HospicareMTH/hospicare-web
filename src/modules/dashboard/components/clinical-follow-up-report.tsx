import { describeEvaluatedShare } from "../indicator-values";
import type { ClinicalFollowUpReport } from "../service";
import {
  IndicatorReportSection,
  type ReportIndicator,
} from "./indicator-report-section";

const REPORT_TITLE_ID = "clinical-follow-up-report-title";

function listIndicators(report: ClinicalFollowUpReport): ReportIndicator[] {
  return [
    {
      label: "Delirium probable en la evaluación CAM",
      value: describeEvaluatedShare(
        report.deliriumLikelyCount,
        report.camEvaluatedCount,
      ),
    },
    {
      label: "Úlceras en la evaluación física de ingreso",
      value: describeEvaluatedShare(
        report.pressureUlcerCount,
        report.physicalEvaluatedCount,
      ),
    },
    {
      label: `Evoluciones registradas en los últimos ${report.windowDays} días`,
      value: report.recentDailyEvolutionCount,
    },
  ];
}

export function ClinicalFollowUpReportSection({
  report,
}: {
  report: ClinicalFollowUpReport;
}) {
  return (
    <IndicatorReportSection
      titleId={REPORT_TITLE_ID}
      title="Seguimiento clínico"
      description="Hallazgos de las evaluaciones de los huéspedes vigentes y actividad de la evolución diaria."
      link={null}
      indicators={listIndicators(report)}
    />
  );
}
