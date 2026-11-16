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

import { CATALOG_OPTION_STATE_PARAMETER } from "../../schemas";
import {
  deactivateHealthcareProfessionalAction,
  reactivateHealthcareProfessionalAction,
} from "../actions";
import {
  DEFAULT_HEALTHCARE_PROFESSIONAL_SORT,
  HEALTHCARE_PROFESSIONAL_STATE_PARAMETERS,
  HEALTHCARE_PROFESSIONALS_TABLE_KEY,
  type HealthcareProfessionalListQuery,
  type HealthcareProfessionalSortKey,
} from "../list-query";
import type { HealthcareProfessionalRecord } from "../repository";
import { HealthcareProfessionalDialog } from "./healthcare-professional-dialog";

const OPTIONAL_CELL_CLASS_NAME = "whitespace-normal text-muted-foreground";

const COLUMNS: DataTableColumn<
  HealthcareProfessionalRecord,
  HealthcareProfessionalSortKey
>[] = [
  {
    id: "fullName",
    label: "Nombre",
    sortKey: "fullName",
    canHide: false,
    cellClassName: "font-medium whitespace-normal",
    cell: (professional) => professional.fullName,
  },
  {
    id: "specialty",
    label: "Especialidad",
    className: "hidden @lg:table-cell",
    cellClassName: OPTIONAL_CELL_CLASS_NAME,
    cell: (professional) => professional.specialty,
  },
  {
    id: "licenseNumber",
    label: "Matrícula",
    className: "hidden @2xl:table-cell",
    cellClassName: `${OPTIONAL_CELL_CLASS_NAME} tabular-nums`,
    cell: (professional) => professional.licenseNumber,
  },
  {
    id: "phone",
    label: "Teléfono",
    className: "hidden @3xl:table-cell",
    cellClassName: `${OPTIONAL_CELL_CLASS_NAME} tabular-nums`,
    cell: (professional) => professional.phone,
  },
  {
    id: "email",
    label: "Correo",
    className: "hidden @4xl:table-cell",
    cellClassName: `${OPTIONAL_CELL_CLASS_NAME} break-all`,
    cell: (professional) => professional.email,
  },
  {
    id: "state",
    label: "Estado",
    cell: (professional) =>
      professional.isActive ? (
        <Badge variant="outline">Activo</Badge>
      ) : (
        <Badge variant="secondary">Inactivo</Badge>
      ),
  },
];

function describeProfessionalCount(count: number): string {
  return count === 1 ? "1 profesional" : `${count} profesionales`;
}

export type HealthcareProfessionalAbilities = {
  canCreate: boolean;
  canUpdate: boolean;
  canDeactivate: boolean;
};

type OpenDialog =
  | { kind: "create" }
  | { kind: "edit"; professional: HealthcareProfessionalRecord }
  | { kind: "deactivate"; professional: HealthcareProfessionalRecord }
  | { kind: "reactivate"; professional: HealthcareProfessionalRecord };

export function HealthcareProfessionalsTable({
  catalogLabel,
  professionalPage,
  query,
  hiddenColumns,
  saveHiddenColumnsAction,
  abilities,
}: {
  catalogLabel: string;
  professionalPage: ListPage<HealthcareProfessionalRecord>;
  query: HealthcareProfessionalListQuery;
  hiddenColumns: string[];
  saveHiddenColumnsAction: SaveHiddenColumnsAction;
  abilities: HealthcareProfessionalAbilities;
}) {
  const [openDialog, setOpenDialog] = useState<OpenDialog | null>(null);
  const closeDialog = () => setOpenDialog(null);
  const hasFilters = query.search !== "" || query.state !== "active";

  function getProfessionalActions(
    professional: HealthcareProfessionalRecord,
  ): RowAction[] {
    const actions: RowAction[] = [];
    if (abilities.canUpdate) {
      actions.push({
        label: "Editar",
        icon: PencilEdit02Icon,
        isDestructive: false,
        open: () => setOpenDialog({ kind: "edit", professional }),
      });
    }
    if (professional.isActive && abilities.canDeactivate) {
      actions.push({
        label: "Desactivar",
        icon: CancelCircleIcon,
        isDestructive: true,
        open: () => setOpenDialog({ kind: "deactivate", professional }),
      });
    }
    if (!professional.isActive && abilities.canUpdate) {
      actions.push({
        label: "Reactivar",
        icon: CheckmarkCircle02Icon,
        isDestructive: false,
        open: () => setOpenDialog({ kind: "reactivate", professional }),
      });
    }
    return actions;
  }

  return (
    <>
      <DataTable
        columns={COLUMNS}
        page={professionalPage}
        query={query}
        defaultSort={DEFAULT_HEALTHCARE_PROFESSIONAL_SORT}
        searchLabel={`Buscar en ${catalogLabel}`}
        emptyMessage={
          hasFilters
            ? "Ningún profesional coincide con los filtros."
            : "Todavía no hay profesionales cargados."
        }
        totalLabel={describeProfessionalCount(professionalPage.totalCount)}
        paginationLabel="Páginas de profesionales"
        getRowActions={getProfessionalActions}
        getActionsLabel={(professional) =>
          `Acciones de ${professional.fullName}`
        }
        hiddenColumns={hiddenColumns}
        onHiddenColumnsChange={(columns) =>
          saveHiddenColumnsWith(
            saveHiddenColumnsAction,
            HEALTHCARE_PROFESSIONALS_TABLE_KEY,
            columns,
          )
        }
        filters={
          <FilterSelect
            label="Filtrar por estado"
            allLabel="Activos"
            parameter={CATALOG_OPTION_STATE_PARAMETER}
            value={
              query.state === "active"
                ? null
                : HEALTHCARE_PROFESSIONAL_STATE_PARAMETERS[query.state]
            }
            options={[
              {
                value: HEALTHCARE_PROFESSIONAL_STATE_PARAMETERS.inactive,
                label: "Inactivos",
              },
              {
                value: HEALTHCARE_PROFESSIONAL_STATE_PARAMETERS.all,
                label: "Todos",
              },
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
              Nuevo profesional
            </Button>
          )
        }
      />

      {openDialog?.kind === "create" && (
        <HealthcareProfessionalDialog
          professional={null}
          onClose={closeDialog}
        />
      )}
      {openDialog?.kind === "edit" && (
        <HealthcareProfessionalDialog
          professional={openDialog.professional}
          onClose={closeDialog}
        />
      )}
      {openDialog?.kind === "deactivate" && (
        <ConfirmActionDialog
          icon={CancelCircleIcon}
          title={`¿Desactivar a ${openDialog.professional.fullName}?`}
          description="Deja de ofrecerse en los formularios y de usarse para nuevas firmas. Los registros que ya lo usan lo siguen mostrando."
          confirmLabel="Desactivar"
          pendingLabel="Desactivando…"
          successMessage="Profesional desactivado."
          isDestructive
          action={() =>
            deactivateHealthcareProfessionalAction(openDialog.professional.id)
          }
          onClose={closeDialog}
        />
      )}
      {openDialog?.kind === "reactivate" && (
        <ConfirmActionDialog
          icon={CheckmarkCircle02Icon}
          title={`¿Reactivar a ${openDialog.professional.fullName}?`}
          description="Vuelve a ofrecerse en los formularios."
          confirmLabel="Reactivar"
          pendingLabel="Reactivando…"
          successMessage="Profesional reactivado."
          isDestructive={false}
          action={() =>
            reactivateHealthcareProfessionalAction(openDialog.professional.id)
          }
          onClose={closeDialog}
        />
      )}
    </>
  );
}
