"use client";

import {
  Cancel01Icon,
  PencilEdit02Icon,
  UserAdd01Icon,
  ViewIcon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import type { RowAction } from "@/components/shared/data-table/action-table-row";
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
import type { ListPage } from "@/platform/list-query";

import {
  buildEditGuestPath,
  buildGuestPath,
  DEFAULT_GUEST_SORT,
  GUEST_ORIGIN_LABELS,
  GUESTS_TABLE_KEY,
  type GuestListQuery,
  type GuestSortKey,
  NEW_GUEST_PATH,
  ORIGIN_FILTER_OPTIONS,
  ORIGIN_FILTER_PARAMETER,
  toOriginFilterValue,
} from "../schemas";
import { AnnulGuestDialog } from "./annul-guest-dialog";
import type { GuestListItem } from "../service";

const SECONDARY_LINE_CLASS_NAME = "text-sm text-muted-foreground";
const SEARCH_LABEL = "Buscar huéspedes";

function describeGuestCount(count: number): string {
  return count === 1 ? "1 huésped" : `${count} huéspedes`;
}

function describeEmptyList(query: GuestListQuery): string {
  if (query.search) {
    return `Ningún huésped coincide con “${query.search}”.`;
  }
  if (query.origin) {
    return "Ningún huésped coincide con el origen elegido.";
  }
  return "Todavía no hay huéspedes.";
}

const COLUMNS: DataTableColumn<GuestListItem, GuestSortKey>[] = [
  {
    id: "clinicalRecordNumber",
    label: "N.° de historia clínica",
    cellClassName: "tabular-nums",
    cell: (guest) => guest.clinicalRecordNumber,
  },
  {
    id: "guest",
    label: "Huésped",
    sortKey: "guestName",
    canHide: false,
    cellClassName: "whitespace-normal font-medium",
    cell: (guest) => guest.fullName,
  },
  {
    id: "dni",
    label: "DNI",
    sortKey: "dni",
    cellClassName: "tabular-nums",
    cell: (guest) => formatDni(guest.dni),
  },
  {
    id: "hospitalizationDate",
    label: "Fecha de internación",
    sortKey: "hospitalizationDate",
    className: "hidden @lg:table-cell",
    cellClassName: "tabular-nums",
    cell: (guest) => formatIsoDate(guest.hospitalizationDate),
  },
  {
    id: "healthInsurance",
    label: "Obra social",
    className: "hidden @3xl:table-cell",
    cellClassName: "whitespace-normal",
    cell: (guest) =>
      guest.healthInsuranceLabel && (
        <div className="flex flex-col">
          <span>{guest.healthInsuranceLabel}</span>
          {guest.healthInsuranceMemberNumber && (
            <span className={SECONDARY_LINE_CLASS_NAME}>
              Afiliado {guest.healthInsuranceMemberNumber}
            </span>
          )}
        </div>
      ),
  },
  {
    id: "origin",
    label: "Origen",
    className: "hidden @3xl:table-cell",
    cell: (guest) => GUEST_ORIGIN_LABELS[guest.origin],
  },
  {
    id: "createdAt",
    label: "Fecha de carga",
    sortKey: "createdAt",
    className: "hidden @5xl:table-cell",
    cellClassName: "tabular-nums text-muted-foreground",
    cell: (guest) => formatDateTime(guest.createdAt),
  },
];

export function GuestsTable({
  page,
  query,
  hiddenColumns,
  saveHiddenColumnsAction,
  canCreateManually,
  canUpdate,
  canAnnul,
}: {
  page: ListPage<GuestListItem>;
  query: GuestListQuery;
  hiddenColumns: string[];
  saveHiddenColumnsAction: SaveHiddenColumnsAction;
  canCreateManually: boolean;
  canUpdate: boolean;
  canAnnul: boolean;
}) {
  const router = useRouter();
  const [guestToAnnul, setGuestToAnnul] = useState<GuestListItem | null>(null);

  function openGuest(guest: GuestListItem) {
    router.push(buildGuestPath(guest.id));
  }

  function getGuestActions(guest: GuestListItem): RowAction[] {
    const actions: RowAction[] = [
      {
        label: "Ver huésped",
        icon: ViewIcon,
        isDestructive: false,
        open: () => openGuest(guest),
      },
    ];
    if (canUpdate) {
      actions.push({
        label: "Editar",
        icon: PencilEdit02Icon,
        isDestructive: false,
        open: () => router.push(buildEditGuestPath(guest.id)),
      });
    }
    if (canAnnul) {
      actions.push({
        label: "Anular",
        icon: Cancel01Icon,
        isDestructive: true,
        open: () => setGuestToAnnul(guest),
      });
    }
    return actions;
  }

  return (
    <>
      <DataTable
        columns={COLUMNS}
        page={page}
        query={query}
        defaultSort={DEFAULT_GUEST_SORT}
        searchLabel={SEARCH_LABEL}
        filters={
          <FilterSelect
            label="Filtrar por origen"
            allLabel="Todos los orígenes"
            parameter={ORIGIN_FILTER_PARAMETER}
            value={toOriginFilterValue(query.origin)}
            options={ORIGIN_FILTER_OPTIONS}
          />
        }
        action={
          canCreateManually && (
            <Button asChild className={DIALOG_BUTTON_CLASS_NAME}>
              <Link href={NEW_GUEST_PATH}>
                <HugeiconsIcon
                  icon={UserAdd01Icon}
                  data-icon="inline-start"
                  aria-hidden="true"
                />
                Nuevo huésped
              </Link>
            </Button>
          )
        }
        emptyMessage={describeEmptyList(query)}
        totalLabel={describeGuestCount(page.totalCount)}
        paginationLabel="Páginas de huéspedes"
        getRowActions={getGuestActions}
        onOpenRow={openGuest}
        getActionsLabel={(guest) => `Acciones de ${guest.fullName}`}
        hiddenColumns={hiddenColumns}
        onHiddenColumnsChange={(columns) =>
          saveHiddenColumnsWith(
            saveHiddenColumnsAction,
            GUESTS_TABLE_KEY,
            columns,
          )
        }
      />
      {guestToAnnul && (
        <AnnulGuestDialog
          guest={guestToAnnul}
          onClose={() => setGuestToAnnul(null)}
        />
      )}
    </>
  );
}
