"use client";

import {
  DataTable,
  type DataTableColumn,
} from "@/components/shared/data-table/data-table";
import { FilterSelect } from "@/components/shared/data-table/filter-select";
import {
  type SaveHiddenColumnsAction,
  saveHiddenColumnsWith,
} from "@/components/shared/data-table/save-hidden-columns";
import { Badge } from "@/components/ui/badge";
import type { ListPage } from "@/platform/list-query";

import {
  CATALOG_OPTION_STATE_PARAMETER,
  CATALOG_OPTION_STATE_PARAMETERS,
  CATALOG_OPTIONS_TABLE_KEY,
  type CatalogOptionListQuery,
  type CatalogOptionSortKey,
  DEFAULT_CATALOG_OPTION_SORT,
} from "../schemas";
import type { CatalogOptionListItem } from "../service";

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

function hasNoActions(): [] {
  return [];
}

export function CatalogOptionsTable({
  catalogLabel,
  optionPage,
  query,
  hiddenColumns,
  saveHiddenColumnsAction,
}: {
  catalogLabel: string;
  optionPage: ListPage<CatalogOptionListItem>;
  query: CatalogOptionListQuery;
  hiddenColumns: string[];
  saveHiddenColumnsAction: SaveHiddenColumnsAction;
}) {
  const hasFilters = query.search !== "" || query.state !== "active";

  return (
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
      getRowActions={hasNoActions}
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
    />
  );
}
