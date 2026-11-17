import Link from "next/link";

import { ADMISSIONS_DESTINATION } from "@/components/shared/navigation";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

import type { AdmissionsReportView } from "../service";

const REPORT_TITLE_ID = "admissions-report-title";

type IndicatorRow = {
  label: string;
  value: number;
};

function listIndicators(report: AdmissionsReportView): IndicatorRow[] {
  return [
    {
      label: `Entrevistas cargadas en los últimos ${report.windowDays} días`,
      value: report.createdInWindowCount,
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
    <section
      aria-labelledby={REPORT_TITLE_ID}
      className="flex flex-col gap-4 lg:max-w-[calc(50%-0.5rem)]"
    >
      <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex flex-col gap-1">
          <h2 id={REPORT_TITLE_ID} className="text-lg font-semibold">
            Admisiones
          </h2>
          <p className="text-base text-muted-foreground">
            Entrevistas recientes y las que esperan una decisión.
          </p>
        </div>
        {report.canViewInterviews && (
          <Link
            href={ADMISSIONS_DESTINATION.href}
            className="text-base text-primary underline-offset-4 hover:underline"
          >
            Ver entrevistas
          </Link>
        )}
      </div>
      <div className="overflow-hidden rounded-xl border">
        <Table className="text-base">
          <TableHeader className="bg-muted/60">
            <TableRow className="hover:bg-transparent">
              <TableHead className="font-semibold text-foreground">
                Indicador
              </TableHead>
              <TableHead className="w-24 text-right font-semibold text-foreground">
                Cantidad
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {listIndicators(report).map((indicator) => (
              <TableRow key={indicator.label} className="h-11">
                <TableCell className="whitespace-normal">
                  {indicator.label}
                </TableCell>
                <TableCell className="text-right font-medium tabular-nums">
                  {indicator.value}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </section>
  );
}
