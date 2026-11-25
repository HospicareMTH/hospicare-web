import { GUESTS_DESTINATION } from "@/components/shared/navigation";

import { describeCountWithShare } from "../indicator-values";
import type { GuestsReportView } from "../service";
import {
  IndicatorReportSection,
  type ReportIndicator,
} from "./indicator-report-section";

const REPORT_TITLE_ID = "guests-report-title";

function listIndicators(report: GuestsReportView): ReportIndicator[] {
  return [
    { label: "Huéspedes vigentes", value: report.activeCount },
    {
      label: "Ingresaron desde una entrevista",
      value: report.fromAdmissionCount,
    },
    {
      label: "Con obra social cargada",
      value: describeCountWithShare(
        report.withHealthInsuranceCount,
        report.activeCount,
        "Sin huéspedes",
      ),
    },
  ];
}

export function GuestsReportSection({ report }: { report: GuestsReportView }) {
  return (
    <IndicatorReportSection
      titleId={REPORT_TITLE_ID}
      title="Huéspedes"
      description="Huéspedes vigentes, cómo llegaron y si tienen la obra social cargada."
      link={
        report.canViewGuests
          ? { href: GUESTS_DESTINATION.href, label: "Ver huéspedes" }
          : null
      }
      indicators={listIndicators(report)}
    />
  );
}
