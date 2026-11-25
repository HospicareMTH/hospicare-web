import Link from "next/link";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export type ReportIndicator = {
  label: string;
  value: number | string;
};

export type ReportLink = {
  href: string;
  label: string;
};

export function IndicatorReportSection({
  titleId,
  title,
  description,
  link,
  indicators,
}: {
  titleId: string;
  title: string;
  description: string;
  link: ReportLink | null;
  indicators: ReportIndicator[];
}) {
  return (
    <section
      aria-labelledby={titleId}
      className="flex flex-col gap-4 lg:max-w-[calc(50%-0.5rem)]"
    >
      <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex flex-col gap-1">
          <h2 id={titleId} className="text-lg font-semibold">
            {title}
          </h2>
          <p className="text-base text-muted-foreground">{description}</p>
        </div>
        {link && (
          <Link
            href={link.href}
            className="shrink-0 text-base text-primary underline-offset-4 hover:underline"
          >
            {link.label}
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
              <TableHead className="text-right font-semibold text-foreground">
                Valor
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {indicators.map((indicator) => (
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
