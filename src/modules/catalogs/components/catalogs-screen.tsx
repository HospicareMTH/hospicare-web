import { forbidden } from "next/navigation";
import { Suspense } from "react";

import { DataTableSkeleton } from "@/components/shared/data-table/data-table-skeleton";
import {
  getCurrentUser,
  getHiddenColumns,
  hasPermission,
  saveHiddenColumnsAction,
} from "@/modules/access";
import { readSearchParam, type SearchParams } from "@/platform/list-query";

import { catalogPermission } from "../definitions";
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
  const query = parseCatalogOptionListQuery(parameters);
  const [optionPage, hiddenColumns] = await Promise.all([
    searchCatalogOptions(catalog.key, query),
    getHiddenColumns(access.userId, CATALOG_OPTIONS_TABLE_KEY),
  ]);
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
      <CatalogOptionsTable
        key={catalog.key}
        catalogKey={catalog.key}
        catalogLabel={catalog.label}
        optionPage={optionPage}
        query={query}
        hiddenColumns={hiddenColumns}
        saveHiddenColumnsAction={saveHiddenColumnsAction}
        abilities={{
          canCreate: hasPermission(
            access,
            catalogPermission(catalog, "create"),
          ),
          canUpdate: hasPermission(
            access,
            catalogPermission(catalog, "update"),
          ),
          canDeactivate: hasPermission(
            access,
            catalogPermission(catalog, "delete"),
          ),
        }}
      />
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
