"use client";

import { ClipboardPlusIcon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import Link from "next/link";

import {
  DataTable,
  type DataTableColumn,
} from "@/components/shared/data-table/data-table";
import { FilterSelect } from "@/components/shared/data-table/filter-select";
import {
  type SaveHiddenColumnsAction,
  saveHiddenColumnsWith,
} from "@/components/shared/data-table/save-hidden-columns";
import { DIALOG_BUTTON_CLASS_NAME } from "@/components/shared/form-styles";
import { Button } from "@/components/ui/button";
import { formatDateTime, formatIsoDate } from "@/platform/dates";
import { formatDni } from "@/platform/dni";

import {
  ADMISSION_INTERVIEWS_TABLE_KEY,
  type AdmissionInterviewListQuery,
  type AdmissionInterviewSortKey,
  DEFAULT_ADMISSION_INTERVIEW_SORT,
  NEW_ADMISSION_INTERVIEW_PATH,
  PRIMARY_DOCTOR_FILTER_PARAMETER,
  RELATIONSHIP_FILTER_PARAMETER,
} from "../schemas";
import type {
  AdmissionInterviewList,
  AdmissionInterviewListItem,
} from "../service";

const SECONDARY_LINE_CLASS_NAME = "text-sm text-muted-foreground";
const SEARCH_LABEL = "Buscar entrevistas";

function describeInterviewCount(count: number): string {
  return count === 1 ? "1 entrevista" : `${count} entrevistas`;
}

function describeEmptyList(query: AdmissionInterviewListQuery): string {
  if (query.search) {
    return `Ninguna entrevista coincide con “${query.search}”.`;
  }
  if (query.relationshipOptionId || query.primaryDoctorId) {
    return "Ninguna entrevista coincide con los filtros elegidos.";
  }
  return "Todavía no hay entrevistas de admisión.";
}

const COLUMNS: DataTableColumn<
  AdmissionInterviewListItem,
  AdmissionInterviewSortKey
>[] = [
  {
    id: "guest",
    label: "Huésped",
    sortKey: "guestName",
    canHide: false,
    cellClassName: "whitespace-normal",
    cell: (interview) => (
      <div className="flex flex-col">
        <span className="font-medium">{interview.guestFullName}</span>
        <span className={`${SECONDARY_LINE_CLASS_NAME} whitespace-nowrap`}>
          DNI {formatDni(interview.guestDni)}
        </span>
      </div>
    ),
  },
  {
    id: "interviewDate",
    label: "Fecha de entrevista",
    sortKey: "interviewDate",
    cellClassName: "tabular-nums",
    cell: (interview) => formatIsoDate(interview.interviewDate),
  },
  {
    id: "interviewee",
    label: "Entrevistado",
    sortKey: "intervieweeName",
    className: "hidden @lg:table-cell",
    cellClassName: "whitespace-normal",
    cell: (interview) => (
      <div className="flex flex-col">
        <span>{interview.intervieweeFullName}</span>
        {interview.relationshipLabel && (
          <span className={SECONDARY_LINE_CLASS_NAME}>
            {interview.relationshipLabel}
          </span>
        )}
      </div>
    ),
  },
  {
    id: "primaryDoctor",
    label: "Médico de cabecera",
    className: "hidden @3xl:table-cell",
    cellClassName: "whitespace-normal",
    cell: (interview) => interview.primaryDoctorName,
  },
  {
    id: "referredBy",
    label: "Derivado por",
    className: "hidden @5xl:table-cell",
    cellClassName: "whitespace-normal",
    cell: (interview) => interview.referredBy,
  },
  {
    id: "createdAt",
    label: "Fecha de carga",
    sortKey: "createdAt",
    className: "hidden @5xl:table-cell",
    cellClassName: "tabular-nums text-muted-foreground",
    cell: (interview) => formatDateTime(interview.createdAt),
  },
];

export function AdmissionInterviewsTable({
  interviewList,
  query,
  hiddenColumns,
  saveHiddenColumnsAction,
  canCreate,
}: {
  interviewList: AdmissionInterviewList;
  query: AdmissionInterviewListQuery;
  hiddenColumns: string[];
  saveHiddenColumnsAction: SaveHiddenColumnsAction;
  canCreate: boolean;
}) {
  const { page, relationshipOptions, primaryDoctorOptions } = interviewList;

  return (
    <DataTable
      columns={COLUMNS}
      page={page}
      query={query}
      defaultSort={DEFAULT_ADMISSION_INTERVIEW_SORT}
      searchLabel={SEARCH_LABEL}
      filters={
        <>
          <FilterSelect
            label="Filtrar por vínculo"
            allLabel="Todos los vínculos"
            parameter={RELATIONSHIP_FILTER_PARAMETER}
            value={query.relationshipOptionId}
            options={relationshipOptions}
          />
          <FilterSelect
            label="Filtrar por médico de cabecera"
            allLabel="Todos los médicos"
            parameter={PRIMARY_DOCTOR_FILTER_PARAMETER}
            value={query.primaryDoctorId}
            options={primaryDoctorOptions}
          />
        </>
      }
      action={
        canCreate && (
          <Button asChild className={DIALOG_BUTTON_CLASS_NAME}>
            <Link href={NEW_ADMISSION_INTERVIEW_PATH}>
              <HugeiconsIcon
                icon={ClipboardPlusIcon}
                data-icon="inline-start"
                aria-hidden="true"
              />
              Nueva entrevista
            </Link>
          </Button>
        )
      }
      emptyMessage={describeEmptyList(query)}
      totalLabel={describeInterviewCount(page.totalCount)}
      paginationLabel="Páginas de entrevistas"
      getRowActions={() => []}
      getActionsLabel={(interview) =>
        `Acciones de la entrevista de ${interview.guestFullName}`
      }
      hiddenColumns={hiddenColumns}
      onHiddenColumnsChange={(columns) =>
        saveHiddenColumnsWith(
          saveHiddenColumnsAction,
          ADMISSION_INTERVIEWS_TABLE_KEY,
          columns,
        )
      }
    />
  );
}
