import { forbidden } from "next/navigation";
import { Suspense } from "react";

import { DataTableSkeleton } from "@/components/shared/data-table/data-table-skeleton";
import {
  getCurrentUser,
  getHiddenColumns,
  hasPermission,
  saveHiddenColumnsAction,
  type UserAccess,
} from "@/modules/access";
import { readSearchParam, type SearchParams } from "@/platform/list-query";

import {
  type CatalogDefinition,
  catalogPermission,
  type CatalogPermissionScope,
  HEALTHCARE_PROFESSIONALS_CATALOG,
} from "../definitions";
import { HealthcareProfessionalsTable } from "../professionals/components/healthcare-professionals-table";
import {
  HEALTHCARE_PROFESSIONALS_TABLE_KEY,
  parseHealthcareProfessionalListQuery,
} from "../professionals/list-query";
import { searchHealthcareProfessionals } from "../professionals/service";
import {
  CATALOG_OPTIONS_TABLE_KEY,
  CATALOG_PARAMETER,
  parseCatalogOptionListQuery,
} from "../schemas";
import {
  listVisibleCatalogs,
  resolveVisibleCatalog,
  searchCatalogOptions,
} from "../service";
import { CatalogOptionsTable } from "./catalog-options-table";
import { CatalogPicker, type CatalogChoice } from "./catalog-picker";

function resolveAbilities(access: UserAccess, catalog: CatalogPermissionScope) {
  return {
    canCreate: hasPermission(access, catalogPermission(catalog, "create")),
    canUpdate: hasPermission(access, catalogPermission(catalog, "update")),
    canDeactivate: hasPermission(access, catalogPermission(catalog, "delete")),
  };
}

async function HealthcareProfessionalsContent({
  access,
  parameters,
}: {
  access: UserAccess;
  parameters: SearchParams;
}) {
  const query = parseHealthcareProfessionalListQuery(parameters);
  const [professionalPage, hiddenColumns] = await Promise.all([
    searchHealthcareProfessionals(query),
    getHiddenColumns(access.userId, HEALTHCARE_PROFESSIONALS_TABLE_KEY),
  ]);
  return (
    <HealthcareProfessionalsTable
      catalogLabel={HEALTHCARE_PROFESSIONALS_CATALOG.label}
      professionalPage={professionalPage}
      query={query}
      hiddenColumns={hiddenColumns}
      saveHiddenColumnsAction={saveHiddenColumnsAction}
      abilities={resolveAbilities(access, HEALTHCARE_PROFESSIONALS_CATALOG)}
    />
  );
}

async function CatalogOptionsContent({
  access,
  parameters,
  catalog,
}: {
  access: UserAccess;
  parameters: SearchParams;
  catalog: CatalogDefinition;
}) {
  const query = parseCatalogOptionListQuery(parameters);
  const [optionPage, hiddenColumns] = await Promise.all([
    searchCatalogOptions(catalog.key, query),
    getHiddenColumns(access.userId, CATALOG_OPTIONS_TABLE_KEY),
  ]);
  return (
    <CatalogOptionsTable
      key={catalog.key}
      catalogKey={catalog.key}
      catalogLabel={catalog.label}
      isReorderable={catalog.isReorderable}
      optionPage={optionPage}
      query={query}
      hiddenColumns={hiddenColumns}
      saveHiddenColumnsAction={saveHiddenColumnsAction}
      abilities={resolveAbilities(access, catalog)}
    />
  );
}

async function CatalogsContent({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const { access } = await getCurrentUser();
  const parameters = await searchParams;
  const catalog = resolveVisibleCatalog(
    access,
    readSearchParam(parameters, CATALOG_PARAMETER),
  );
  if (!catalog) {
    forbidden();
  }
  const catalogChoices: CatalogChoice[] = listVisibleCatalogs(access).map(
    ({ slug, label, group }) => ({ slug, label, group }),
  );

  return (
    <div className="flex flex-1 flex-col gap-4">
      <CatalogPicker
        catalogs={catalogChoices}
        currentCatalog={{
          slug: catalog.slug,
          label: catalog.label,
          group: catalog.group,
        }}
      />
      {catalog.kind === "healthcareProfessionals" ? (
        <HealthcareProfessionalsContent
          access={access}
          parameters={parameters}
        />
      ) : (
        <CatalogOptionsContent
          access={access}
          parameters={parameters}
          catalog={catalog}
        />
      )}
    </div>
  );
}

export function CatalogsScreen({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  return (
    <Suspense fallback={<DataTableSkeleton label="Cargando catálogos…" />}>
      <CatalogsContent searchParams={searchParams} />
    </Suspense>
  );
}
