import { hasPermission, type UserAccess } from "@/modules/access";
import {
  type AdmissionsReport,
  getAdmissionsReport,
} from "@/modules/admissions";
import { countAuditEntriesSince } from "@/modules/audit";
import {
  buildCatalogHref,
  type CatalogGroup,
  countActiveCatalogEntries,
  listVisibleCatalogs,
} from "@/modules/catalogs";
import { getReportWindowStart, REPORT_WINDOW_DAYS } from "@/platform/dates";

export type ActiveCatalogEntryRow = {
  slug: string;
  label: string;
  group: CatalogGroup;
  activeCount: number;
  href: string | null;
};

export type DataQualityReport = {
  activeCatalogEntries: ActiveCatalogEntryRow[];
};

export async function getDataQualityReport(
  access: UserAccess,
): Promise<DataQualityReport | null> {
  if (!hasPermission(access, "dashboard.data_quality.view")) {
    return null;
  }
  const visibleSlugs = new Set(
    listVisibleCatalogs(access).map((catalog) => catalog.slug),
  );
  const entries = await countActiveCatalogEntries();
  return {
    activeCatalogEntries: entries.map((entry) => ({
      ...entry,
      href: visibleSlugs.has(entry.slug) ? buildCatalogHref(entry.slug) : null,
    })),
  };
}

export type AccessesReport = {
  windowDays: number;
  activityInWindowCount: number;
  canViewActivityLog: boolean;
};

export async function getAccessesReportFor(
  access: UserAccess,
  now: Date = new Date(),
): Promise<AccessesReport | null> {
  if (!hasPermission(access, "dashboard.accesses.view")) {
    return null;
  }
  return {
    windowDays: REPORT_WINDOW_DAYS,
    activityInWindowCount: await countAuditEntriesSince(
      getReportWindowStart(now),
    ),
    canViewActivityLog: hasPermission(access, "admin.logs.view"),
  };
}

export type AdmissionsReportView = AdmissionsReport & {
  canViewInterviews: boolean;
};

export async function getAdmissionsReportFor(
  access: UserAccess,
): Promise<AdmissionsReportView | null> {
  if (!hasPermission(access, "dashboard.admissions.view")) {
    return null;
  }
  return {
    ...(await getAdmissionsReport()),
    canViewInterviews: hasPermission(access, "admissions.interviews.view"),
  };
}
