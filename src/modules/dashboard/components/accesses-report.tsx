import Link from "next/link";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ACTIVITY_LOG_PATH } from "@/modules/activity-log";

import type { AccessesReport } from "../service";

const REPORT_TITLE_ID = "accesses-report-title";

export function AccessesReportSection({ report }: { report: AccessesReport }) {
  return (
    <section
      aria-labelledby={REPORT_TITLE_ID}
      className="flex flex-col gap-4 lg:max-w-[calc(50%-0.5rem)]"
    >
      <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex flex-col gap-1">
          <h2 id={REPORT_TITLE_ID} className="text-lg font-semibold">
            Accesos
          </h2>
          <p className="text-base text-muted-foreground">
            Actividad registrada en la última semana.
          </p>
        </div>
        {report.canViewActivityLog && (
          <Link
            href={ACTIVITY_LOG_PATH}
            className="text-base text-primary underline-offset-4 hover:underline"
          >
            Ver registro de actividad
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
            <TableRow className="h-11">
              <TableCell className="whitespace-normal">
                {`Entradas del registro de actividad en los últimos ${report.windowDays} días`}
              </TableCell>
              <TableCell className="text-right font-medium tabular-nums">
                {report.activityInWindowCount}
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </div>
    </section>
  );
}
