"use client";

import {
  CancelCircleIcon,
  CheckmarkCircle02Icon,
  PencilEdit02Icon,
  PlusSignIcon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { useState } from "react";

import { ConfirmActionDialog } from "@/components/shared/confirm-action-dialog";
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
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { ListPage } from "@/platform/list-query";

import {
  deactivateCatalogOptionAction,
  reactivateCatalogOptionAction,
} from "../actions";
import type { CatalogKey } from "../definitions";

import {
  CATALOG_OPTION_STATE_PARAMETER,
  CATALOG_OPTION_STATE_PARAMETERS,
  CATALOG_OPTIONS_TABLE_KEY,
  type CatalogOptionListQuery,
  type CatalogOptionSortKey,
  DEFAULT_CATALOG_OPTION_SORT,
} from "../schemas";
import type { CatalogOptionListItem } from "../service";
import { CatalogOptionDialog } from "./catalog-option-dialog";

const COLUMNS: DataTableColumn<CatalogOptionListItem, CatalogOptionSortKey>[] =
  [
    {
      id: "position",
      label: "Orden",
      sortKey: "sortOrder",
      className: "hidden w-24 @lg:table-cell",
      cellClassName: "tabular-nums text-muted-foreground",
      cell: (option) => option.position,
    },
    {
      id: "label",
      label: "Opción",
      sortKey: "label",
      canHide: false,
      cellClassName: "font-medium whitespace-normal",
      cell: (option) => (
        <span className="flex flex-wrap items-center gap-2">
          {option.label}
          {option.isSystem && <Badge variant="secondary">Base</Badge>}
        </span>
      ),
    },
    {
      id: "description",
      label: "Descripción",
      className: "hidden @2xl:table-cell",
      cellClassName: "whitespace-normal text-muted-foreground",
      cell: (option) => option.description,
    },
    {
      id: "state",
      label: "Estado",
      cell: (option) =>
        option.isActive ? (
          <Badge variant="outline">Activa</Badge>
        ) : (
          <Badge variant="secondary">Inactiva</Badge>
        ),
    },
  ];

function describeOptionCount(count: number): string {
  return count === 1 ? "1 opción" : `${count} opciones`;
}

export type CatalogOptionAbilities = {
  canCreate: boolean;
  canUpdate: boolean;
  canDeactivate: boolean;
};

type OpenDialog =
  | { kind: "create" }
  | { kind: "edit"; option: CatalogOptionListItem }
  | { kind: "deactivate"; option: CatalogOptionListItem }
  | { kind: "reactivate"; option: CatalogOptionListItem };

export function CatalogOptionsTable({
  catalogKey,
  catalogLabel,
  optionPage,
  query,
  hiddenColumns,
  saveHiddenColumnsAction,
  abilities,
}: {
  catalogKey: CatalogKey;
  catalogLabel: string;
  optionPage: ListPage<CatalogOptionListItem>;
  query: CatalogOptionListQuery;
  hiddenColumns: string[];
  saveHiddenColumnsAction: SaveHiddenColumnsAction;
  abilities: CatalogOptionAbilities;
}) {
  const [openDialog, setOpenDialog] = useState<OpenDialog | null>(null);
  const closeDialog = () => setOpenDialog(null);
  const hasFilters = query.search !== "" || query.state !== "active";

  function getOptionActions(option: CatalogOptionListItem): RowAction[] {
    const actions: RowAction[] = [];
    if (abilities.canUpdate) {
      actions.push({
        label: "Editar",
        icon: PencilEdit02Icon,
        isDestructive: false,
        open: () => setOpenDialog({ kind: "edit", option }),
      });
    }
    if (option.isActive && abilities.canDeactivate) {
      actions.push({
        label: "Desactivar",
        icon: CancelCircleIcon,
        isDestructive: true,
        open: () => setOpenDialog({ kind: "deactivate", option }),
      });
    }
    if (!option.isActive && abilities.canUpdate) {
      actions.push({
        label: "Reactivar",
        icon: CheckmarkCircle02Icon,
        isDestructive: false,
        open: () => setOpenDialog({ kind: "reactivate", option }),
      });
    }
    return actions;
  }

  return (
    <>
      <DataTable
        columns={COLUMNS}
        page={optionPage}
        query={query}
        defaultSort={DEFAULT_CATALOG_OPTION_SORT}
        searchLabel={`Buscar en ${catalogLabel}`}
        emptyMessage={
          hasFilters
            ? "Ninguna opción coincide con los filtros."
            : "Este catálogo todavía no tiene opciones."
        }
        totalLabel={describeOptionCount(optionPage.totalCount)}
        paginationLabel="Páginas de opciones"
        getRowActions={getOptionActions}
        getActionsLabel={(option) => `Acciones de ${option.label}`}
        hiddenColumns={hiddenColumns}
        onHiddenColumnsChange={(columns) =>
          saveHiddenColumnsWith(
            saveHiddenColumnsAction,
            CATALOG_OPTIONS_TABLE_KEY,
            columns,
          )
        }
        filters={
          <FilterSelect
            label="Filtrar por estado"
            allLabel="Activas"
            parameter={CATALOG_OPTION_STATE_PARAMETER}
            value={
              query.state === "active"
                ? null
                : CATALOG_OPTION_STATE_PARAMETERS[query.state]
            }
            options={[
              {
                value: CATALOG_OPTION_STATE_PARAMETERS.inactive,
                label: "Inactivas",
              },
              { value: CATALOG_OPTION_STATE_PARAMETERS.all, label: "Todas" },
            ]}
          />
        }
        action={
          abilities.canCreate && (
            <Button
              onClick={() => setOpenDialog({ kind: "create" })}
              className={DIALOG_BUTTON_CLASS_NAME}
            >
              <HugeiconsIcon
                icon={PlusSignIcon}
                data-icon="inline-start"
                aria-hidden="true"
              />
              Nueva opción
            </Button>
          )
        }
      />

      {openDialog?.kind === "create" && (
        <CatalogOptionDialog
          catalogKey={catalogKey}
          catalogLabel={catalogLabel}
          option={null}
          onClose={closeDialog}
        />
      )}
      {openDialog?.kind === "edit" && (
        <CatalogOptionDialog
          catalogKey={catalogKey}
          catalogLabel={catalogLabel}
          option={openDialog.option}
          onClose={closeDialog}
        />
      )}
      {openDialog?.kind === "deactivate" && (
        <ConfirmActionDialog
          icon={CancelCircleIcon}
          title={`¿Desactivar «${openDialog.option.label}»?`}
          description="Deja de ofrecerse en los formularios. Los registros que ya la usan la siguen mostrando."
          confirmLabel="Desactivar"
          pendingLabel="Desactivando…"
          successMessage="Opción desactivada."
          isDestructive
          action={() => deactivateCatalogOptionAction(openDialog.option.id)}
          onClose={closeDialog}
        />
      )}
      {openDialog?.kind === "reactivate" && (
        <ConfirmActionDialog
          icon={CheckmarkCircle02Icon}
          title={`¿Reactivar «${openDialog.option.label}»?`}
          description="Vuelve a ofrecerse en los formularios."
          confirmLabel="Reactivar"
          pendingLabel="Reactivando…"
          successMessage="Opción reactivada."
          isDestructive={false}
          action={() => reactivateCatalogOptionAction(openDialog.option.id)}
          onClose={closeDialog}
        />
      )}
    </>
  );
}
