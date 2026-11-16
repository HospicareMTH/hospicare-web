"use client";

import { Columns3CogIcon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  type ColumnVisibilityState,
  columnVisibilityFeature,
  createColumnHelper,
  functionalUpdate,
  tableFeatures,
  type Updater,
  useTable,
} from "@tanstack/react-table";
import { type ReactNode, useState } from "react";

import { DIALOG_BUTTON_CLASS_NAME } from "@/components/shared/form-styles";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { ListPage, ListQuery, ListSort } from "@/platform/list-query";

import { ActionTableRow, type RowAction } from "./action-table-row";
import { DataTablePagination } from "./data-table-pagination";
import { DataTableToolbar } from "./data-table-toolbar";
import { SortableHead } from "./list-controls";
import { type RowReorder, SortableRowsContext } from "./sortable-rows-context";
import { SortableTableRow } from "./sortable-table-row";

const features = tableFeatures({ columnVisibilityFeature });

const HEAD_CLASS_NAME = "font-semibold text-foreground";
const MENU_ITEM_CLASS_NAME = "h-10 text-base whitespace-nowrap";

export type DataTableColumn<Row, SortKey extends string> = {
  id: string;
  label: string;
  cell: (row: Row) => ReactNode;
  sortKey?: SortKey;
  canHide?: boolean;
  className?: string;
  cellClassName?: string;
};

function toVisibilityState(hiddenColumns: string[]): ColumnVisibilityState {
  return Object.fromEntries(hiddenColumns.map((id) => [id, false]));
}

function toHiddenColumns(visibility: ColumnVisibilityState): string[] {
  return Object.keys(visibility).filter((id) => visibility[id] === false);
}

export function DataTable<Row extends { id: string }, SortKey extends string>({
  columns,
  page,
  query,
  defaultSort,
  searchLabel,
  filters,
  action,
  emptyMessage,
  totalLabel,
  paginationLabel,
  getRowActions,
  getActionsLabel,
  hiddenColumns,
  onHiddenColumnsChange,
  reorder,
}: {
  columns: DataTableColumn<Row, SortKey>[];
  page: ListPage<Row>;
  query: ListQuery<SortKey>;
  defaultSort: ListSort<SortKey>;
  searchLabel: string;
  filters?: ReactNode;
  action?: ReactNode;
  emptyMessage: string;
  totalLabel: string;
  paginationLabel: string;
  getRowActions: (row: Row) => RowAction[];
  getActionsLabel: (row: Row) => string;
  hiddenColumns: string[];
  onHiddenColumnsChange: (hiddenColumns: string[]) => void;
  reorder?: RowReorder<Row>;
}) {
  const [selectedRowId, setSelectedRowId] = useState<string | null>(null);
  const [columnVisibility, setColumnVisibility] = useState(() =>
    toVisibilityState(hiddenColumns),
  );
  const columnsById = new Map(columns.map((column) => [column.id, column]));
  const columnHelper = createColumnHelper<typeof features, Row>();

  function changeColumnVisibility(updater: Updater<ColumnVisibilityState>) {
    const nextVisibility = functionalUpdate(updater, columnVisibility);
    setColumnVisibility(nextVisibility);
    onHiddenColumnsChange(toHiddenColumns(nextVisibility));
  }

  const table = useTable({
    features,
    data: page.items,
    columns: columns.map((column) =>
      columnHelper.display({
        id: column.id,
        header: column.label,
        cell: ({ row }) => column.cell(row.original),
        enableHiding: column.canHide !== false,
      }),
    ),
    getRowId: (row) => row.id,
    state: { columnVisibility },
    onColumnVisibilityChange: changeColumnVisibility,
  });

  const hideableColumns = table
    .getAllLeafColumns()
    .filter((column) => column.getCanHide());
  const sortProps = { sort: query.sort, defaultSort };

  const columnMenu = hideableColumns.length > 0 && (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" className={DIALOG_BUTTON_CLASS_NAME}>
          <HugeiconsIcon
            icon={Columns3CogIcon}
            data-icon="inline-start"
            aria-hidden="true"
          />
          Columnas
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-56">
        <DropdownMenuLabel className="text-sm">
          Columnas visibles
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {hideableColumns.map((column) => (
          <DropdownMenuCheckboxItem
            key={column.id}
            checked={column.getIsVisible()}
            onCheckedChange={(isChecked) =>
              column.toggleVisibility(isChecked === true)
            }
            onSelect={(event) => event.preventDefault()}
            className={MENU_ITEM_CLASS_NAME}
          >
            {columnsById.get(column.id)?.label}
          </DropdownMenuCheckboxItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );

  const reorderColumnCount = reorder ? 1 : 0;
  const visibleColumnCount =
    table.getVisibleLeafColumns().length + reorderColumnCount;
  const rows = table.getRowModel().rows;

  const tableFrame = (
    <div className="@container overflow-hidden rounded-xl border">
      <Table className="text-base">
        <TableHeader className="bg-muted/60">
          <TableRow className="hover:bg-transparent">
            {reorder && (
              <TableHead className="w-12">
                <span className="sr-only">Mover</span>
              </TableHead>
            )}
            {table.getVisibleLeafColumns().map((tableColumn) => {
              const column = columnsById.get(tableColumn.id);
              if (!column) {
                return null;
              }
              return column.sortKey ? (
                <SortableHead
                  key={column.id}
                  label={column.label}
                  sortKey={column.sortKey}
                  className={column.className}
                  {...sortProps}
                />
              ) : (
                <TableHead
                  key={column.id}
                  className={`${HEAD_CLASS_NAME} ${column.className ?? ""}`}
                >
                  {column.label}
                </TableHead>
              );
            })}
            <TableHead className="w-14">
              <span className="sr-only">Acciones</span>
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.length === 0 && (
            <TableRow className="hover:bg-transparent">
              <TableCell
                colSpan={visibleColumnCount + 1}
                className="h-24 text-center whitespace-normal text-muted-foreground"
              >
                {emptyMessage}
              </TableCell>
            </TableRow>
          )}
          {rows.map((row) => {
            const rowProps = {
              actions: getRowActions(row.original),
              actionsLabel: getActionsLabel(row.original),
              isSelected: row.id === selectedRowId,
              onSelect: () => setSelectedRowId(row.id),
              children: row.getVisibleCells().map((cell) => {
                const column = columnsById.get(cell.column.id);
                return (
                  <TableCell
                    key={cell.id}
                    className={`${column?.className ?? ""} ${column?.cellClassName ?? ""}`}
                  >
                    <table.FlexRender cell={cell} />
                  </TableCell>
                );
              }),
            };
            return reorder ? (
              <SortableTableRow
                key={row.id}
                id={row.id}
                rowLabel={reorder.getRowLabel(row.original)}
                {...rowProps}
              />
            ) : (
              <ActionTableRow key={row.id} {...rowProps} />
            );
          })}
        </TableBody>
      </Table>
    </div>
  );

  return (
    <div className="flex flex-col gap-4">
      <DataTableToolbar
        search={query.search}
        searchLabel={searchLabel}
        filters={filters}
        columnMenu={columnMenu}
        action={action}
      />

      {reorder ? (
        <SortableRowsContext rows={page.items} reorder={reorder}>
          {tableFrame}
        </SortableRowsContext>
      ) : (
        tableFrame
      )}

      <DataTablePagination
        totalLabel={totalLabel}
        paginationLabel={paginationLabel}
        page={page.page}
        pageCount={page.pageCount}
        pageSize={page.pageSize}
      />
    </div>
  );
}
