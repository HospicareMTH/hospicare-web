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
import { countRecentDailyEvolutions } from "@/modules/daily-evolutions";
import {
  type EvaluationFindingsReport,
  getEvaluationFindingsReport,
} from "@/modules/evaluations";
import {
  getGuestsReport,
  type GuestsReport,
  listAcceptedInterviewIds,
} from "@/modules/guests";
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
    ...(await getAdmissionsReport(await listAcceptedInterviewIds())),
    canViewInterviews: hasPermission(access, "admissions.interviews.view"),
  };
}

export type GuestsReportView = GuestsReport & {
  canViewGuests: boolean;
};

export async function getGuestsReportFor(
  access: UserAccess,
): Promise<GuestsReportView | null> {
  if (!hasPermission(access, "dashboard.guests.view")) {
    return null;
  }
  return {
    ...(await getGuestsReport()),
    canViewGuests: hasPermission(access, "guests.records.view"),
  };
}

export type ClinicalFollowUpReport = EvaluationFindingsReport & {
  windowDays: number;
  recentDailyEvolutionCount: number;
};

export async function getClinicalFollowUpReportFor(
  access: UserAccess,
  now: Date = new Date(),
): Promise<ClinicalFollowUpReport | null> {
  if (!hasPermission(access, "dashboard.clinical_follow_up.view")) {
    return null;
  }
  return {
    ...(await getEvaluationFindingsReport()),
    windowDays: REPORT_WINDOW_DAYS,
    recentDailyEvolutionCount: await countRecentDailyEvolutions(now),
  };
}
