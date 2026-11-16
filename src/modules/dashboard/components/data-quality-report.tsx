import Link from "next/link";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { CATALOG_GROUP_LABELS, type CatalogGroup } from "@/modules/catalogs";

import type { ActiveCatalogEntryRow, DataQualityReport } from "../service";

const REPORT_TITLE_ID = "data-quality-report-title";

const REPORTED_GROUPS: CatalogGroup[] = ["admissions", "guests"];

function ActiveCatalogEntriesTable({
  group,
  entries,
}: {
  group: CatalogGroup;
  entries: ActiveCatalogEntryRow[];
}) {
  const groupLabel = CATALOG_GROUP_LABELS[group];
  return (
    <div className="overflow-hidden rounded-xl border">
      <Table className="text-base">
        <TableHeader className="bg-muted/60">
          <TableRow className="hover:bg-transparent">
            <TableHead className="font-semibold text-foreground">
              {groupLabel}
            </TableHead>
            <TableHead className="w-24 text-right font-semibold text-foreground">
              Activas
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {entries.map((entry) => (
            <TableRow key={entry.slug} className="h-11">
              <TableCell className="whitespace-normal">
                {entry.href ? (
                  <Link
                    href={entry.href}
                    className="text-primary underline-offset-4 hover:underline"
                  >
                    {entry.label}
                  </Link>
                ) : (
                  entry.label
                )}
              </TableCell>
              <TableCell
                className={
                  entry.activeCount === 0
                    ? "text-right text-muted-foreground tabular-nums"
                    : "text-right font-medium tabular-nums"
                }
              >
                {entry.activeCount}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

export function DataQualityReportSection({
  report,
}: {
  report: DataQualityReport;
}) {
  return (
    <section aria-labelledby={REPORT_TITLE_ID} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <h2 id={REPORT_TITLE_ID} className="text-lg font-semibold">
          Calidad de datos
        </h2>
        <p className="text-base text-muted-foreground">
          Opciones activas por catálogo.
        </p>
      </div>
      <div className="grid items-start gap-4 lg:grid-cols-2">
        {REPORTED_GROUPS.map((group) => (
          <ActiveCatalogEntriesTable
            key={group}
            group={group}
            entries={report.activeCatalogEntries.filter(
              (entry) => entry.group === group,
            )}
          />
        ))}
      </div>
    </section>
  );
}
