"use client";

import { arrayMove } from "@dnd-kit/sortable";
import {
  ArrowDown01Icon,
  ArrowUp01Icon,
  CancelCircleIcon,
  CheckmarkCircle02Icon,
  PencilEdit02Icon,
  PlusSignIcon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { useOptimistic, useState, useTransition } from "react";

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
import { runAction } from "@/components/shared/run-action";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { ListPage } from "@/platform/list-query";

import {
  deactivateCatalogOptionAction,
  moveCatalogOptionAction,
  reactivateCatalogOptionAction,
} from "../actions";
import type { CatalogKey } from "../definitions";

import {
  CATALOG_OPTION_STATE_PARAMETER,
  CATALOG_OPTION_STATE_PARAMETERS,
  CATALOG_OPTIONS_TABLE_KEY,
  type CatalogOptionListQuery,
  type CatalogOptionMoveInput,
  type CatalogOptionSortKey,
  DEFAULT_CATALOG_OPTION_SORT,
} from "../schemas";
import type { CatalogOptionListItem } from "../service";
import { CatalogOptionDialog } from "./catalog-option-dialog";

type CatalogOptionColumn = DataTableColumn<
  CatalogOptionListItem,
  CatalogOptionSortKey
>;

const COLUMNS: CatalogOptionColumn[] = [
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

const MOVE_SUCCESS_MESSAGE = "Orden guardado.";

type MoveDirection = "up" | "down";

function isDefaultOrderView(query: CatalogOptionListQuery): boolean {
  return (
    query.search === "" &&
    query.state === "active" &&
    query.sort.key === DEFAULT_CATALOG_OPTION_SORT.key &&
    query.sort.isDescending === DEFAULT_CATALOG_OPTION_SORT.isDescending
  );
}

function moveOptionInPage(
  options: CatalogOptionListItem[],
  optionId: string,
  targetOptionId: string,
): CatalogOptionListItem[] {
  const optionIndex = options.findIndex((option) => option.id === optionId);
  const targetIndex = options.findIndex(
    (option) => option.id === targetOptionId,
  );
  if (optionIndex === -1 || targetIndex === -1) {
    return options;
  }
  return arrayMove(options, optionIndex, targetIndex);
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
  isReorderable,
  optionPage,
  query,
  hiddenColumns,
  saveHiddenColumnsAction,
  abilities,
}: {
  catalogKey: CatalogKey;
  catalogLabel: string;
  isReorderable: boolean;
  optionPage: ListPage<CatalogOptionListItem>;
  query: CatalogOptionListQuery;
  hiddenColumns: string[];
  saveHiddenColumnsAction: SaveHiddenColumnsAction;
  abilities: CatalogOptionAbilities;
}) {
  const [openDialog, setOpenDialog] = useState<OpenDialog | null>(null);
  const closeDialog = () => setOpenDialog(null);
  const hasFilters = query.search !== "" || query.state !== "active";
  const [isMoving, startMoving] = useTransition();
  const [visibleOptions, showOptimisticMove] = useOptimistic(
    optionPage.items,
    (
      options,
      {
        optionId,
        targetOptionId,
      }: { optionId: string; targetOptionId: string },
    ) => moveOptionInPage(options, optionId, targetOptionId),
  );
  const canReorder =
    isReorderable && abilities.canUpdate && isDefaultOrderView(query);

  function moveOption(
    optionId: string,
    move: CatalogOptionMoveInput,
    targetOptionIdInPage: string | null,
  ) {
    startMoving(async () => {
      if (targetOptionIdInPage) {
        showOptimisticMove({ optionId, targetOptionId: targetOptionIdInPage });
      }
      await runAction(
        () => moveCatalogOptionAction(optionId, move),
        MOVE_SUCCESS_MESSAGE,
      );
    });
  }

  function findNeighborInPage(
    optionId: string,
    direction: MoveDirection,
  ): string | null {
    const optionIndex = visibleOptions.findIndex(
      (option) => option.id === optionId,
    );
    const neighborIndex =
      direction === "up" ? optionIndex - 1 : optionIndex + 1;
    return visibleOptions[neighborIndex]?.id ?? null;
  }

  function canMove(optionId: string, direction: MoveDirection): boolean {
    if (direction === "up") {
      const isFirstOfAll =
        optionPage.page === 1 && visibleOptions[0]?.id === optionId;
      return !isFirstOfAll;
    }
    const isLastOfAll =
      optionPage.page === optionPage.pageCount &&
      visibleOptions.at(-1)?.id === optionId;
    return !isLastOfAll;
  }

  function moveOptionOneStep(optionId: string, direction: MoveDirection) {
    moveOption(
      optionId,
      { direction },
      findNeighborInPage(optionId, direction),
    );
  }

  const moveColumn: CatalogOptionColumn = {
    id: "move",
    label: "Cambiar orden",
    canHide: false,
    className: "hidden w-28 @md:table-cell",
    cell: (option) => (
      <span className="flex items-center gap-1">
        <Button
          variant="ghost"
          size="icon"
          className="size-10"
          aria-label={`Subir ${option.label}`}
          disabled={isMoving || !canMove(option.id, "up")}
          onClick={() => moveOptionOneStep(option.id, "up")}
        >
          <HugeiconsIcon
            icon={ArrowUp01Icon}
            className="size-5"
            aria-hidden="true"
          />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="size-10"
          aria-label={`Bajar ${option.label}`}
          disabled={isMoving || !canMove(option.id, "down")}
          onClick={() => moveOptionOneStep(option.id, "down")}
        >
          <HugeiconsIcon
            icon={ArrowDown01Icon}
            className="size-5"
            aria-hidden="true"
          />
        </Button>
      </span>
    ),
  };

  function getOptionActions(option: CatalogOptionListItem): RowAction[] {
    const actions: RowAction[] = [];
    if (canReorder && canMove(option.id, "up")) {
      actions.push({
        label: "Subir",
        icon: ArrowUp01Icon,
        isDestructive: false,
        open: () => moveOptionOneStep(option.id, "up"),
      });
    }
    if (canReorder && canMove(option.id, "down")) {
      actions.push({
        label: "Bajar",
        icon: ArrowDown01Icon,
        isDestructive: false,
        open: () => moveOptionOneStep(option.id, "down"),
      });
    }
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
        columns={canReorder ? [moveColumn, ...COLUMNS] : COLUMNS}
        page={{ ...optionPage, items: visibleOptions }}
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
        reorder={
          canReorder
            ? {
                getRowLabel: (option) => option.label,
                onMove: (optionId, targetOptionId) =>
                  moveOption(optionId, { targetOptionId }, targetOptionId),
              }
            : undefined
        }
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
