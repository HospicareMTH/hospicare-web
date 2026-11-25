import {
  DOCUMENTATION_DESTINATION,
  NAVIGATION_DESTINATIONS,
} from "@/components/shared/navigation";
import {
  filterAllowedDestinations,
  getAllowedAdminSections,
  hasPermission,
  type UserAccess,
} from "@/modules/access";
import { listVisibleCatalogs } from "@/modules/catalogs";

import {
  ACCOUNT_SECTION,
  ACTIVITY_LOG_SECTION,
  ADMISSIONS_SECTION,
  CATALOGS_SECTION,
  DAILY_EVOLUTIONS_SECTION,
  EVALUATIONS_SECTION,
  GENERAL_USE_SECTION,
  GUESTS_SECTION,
  HOME_SECTION,
  INVITATIONS_SECTION,
  type ManualSection,
  ROLES_SECTION,
  SETTINGS_SECTION,
  SIGN_IN_SECTION,
  USERS_SECTION,
} from "./manual-content";

type ManualEntry = {
  section: ManualSection;
  isVisibleTo: (access: UserAccess) => boolean;
};

const EVERYONE_WITH_MANUAL_ACCESS = () => true;

const MANUAL_ENTRIES: readonly ManualEntry[] = [
  { section: GENERAL_USE_SECTION, isVisibleTo: EVERYONE_WITH_MANUAL_ACCESS },
  { section: SIGN_IN_SECTION, isVisibleTo: EVERYONE_WITH_MANUAL_ACCESS },
  { section: ACCOUNT_SECTION, isVisibleTo: EVERYONE_WITH_MANUAL_ACCESS },
  {
    section: HOME_SECTION,
    isVisibleTo: (access) =>
      hasPermission(access, "dashboard.admissions.view") ||
      hasPermission(access, "dashboard.guests.view") ||
      hasPermission(access, "dashboard.clinical_follow_up.view") ||
      hasPermission(access, "dashboard.data_quality.view") ||
      hasPermission(access, "dashboard.accesses.view"),
  },
  {
    section: ADMISSIONS_SECTION,
    isVisibleTo: (access) =>
      hasPermission(access, "admissions.interviews.view"),
  },
  {
    section: GUESTS_SECTION,
    isVisibleTo: (access) => hasPermission(access, "guests.records.view"),
  },
  {
    section: EVALUATIONS_SECTION,
    isVisibleTo: (access) =>
      hasPermission(access, "guests.cam_evaluations.view") ||
      hasPermission(access, "guests.physical_evaluations.view"),
  },
  {
    section: DAILY_EVOLUTIONS_SECTION,
    isVisibleTo: (access) =>
      hasPermission(access, "guests.daily_evolutions.view"),
  },
  {
    section: USERS_SECTION,
    isVisibleTo: (access) => hasPermission(access, "admin.users.view"),
  },
  {
    section: ROLES_SECTION,
    isVisibleTo: (access) => hasPermission(access, "admin.roles.view"),
  },
  {
    section: INVITATIONS_SECTION,
    isVisibleTo: (access) => hasPermission(access, "admin.invitations.view"),
  },
  {
    section: CATALOGS_SECTION,
    isVisibleTo: (access) => listVisibleCatalogs(access).length > 0,
  },
  {
    section: SETTINGS_SECTION,
    isVisibleTo: (access) =>
      hasPermission(access, "admin.system_settings.view"),
  },
  {
    section: ACTIVITY_LOG_SECTION,
    isVisibleTo: (access) => hasPermission(access, "admin.logs.view"),
  },
];

export type ManualSectionLookup =
  | { status: "visible"; section: ManualSection }
  | { status: "forbidden" }
  | { status: "missing" };

export function listVisibleManualSections(access: UserAccess): ManualSection[] {
  return MANUAL_ENTRIES.filter((entry) => entry.isVisibleTo(access)).map(
    (entry) => entry.section,
  );
}

export function findManualSectionTitle(sectionId: string): string | null {
  return (
    MANUAL_ENTRIES.find((entry) => entry.section.id === sectionId)?.section
      .title ?? null
  );
}

export function findVisibleManualSection(
  access: UserAccess,
  sectionId: string,
): ManualSectionLookup {
  const entry = MANUAL_ENTRIES.find(
    (candidate) => candidate.section.id === sectionId,
  );
  if (!entry) {
    return { status: "missing" };
  }
  if (!entry.isVisibleTo(access)) {
    return { status: "forbidden" };
  }
  return { status: "visible", section: entry.section };
}

export function buildManualSectionHref(sectionId: string): string {
  return `${DOCUMENTATION_DESTINATION.href}/${sectionId}`;
}

export type SearchEntryGroup = "screens" | "manual";

export type SearchEntry = {
  label: string;
  href: string;
  group: SearchEntryGroup;
};

function listSearchableScreens(access: UserAccess): SearchEntry[] {
  const destinations = filterAllowedDestinations(
    access,
    NAVIGATION_DESTINATIONS,
  );
  return [...destinations, ...getAllowedAdminSections(access)].map(
    ({ label, href }) => ({ label, href, group: "screens" }),
  );
}

function listSearchableManualSections(access: UserAccess): SearchEntry[] {
  if (!hasPermission(access, "documentation.app.view")) {
    return [];
  }
  return listVisibleManualSections(access).map(({ id, title }) => ({
    label: title,
    href: buildManualSectionHref(id),
    group: "manual",
  }));
}

export function listSearchEntries(access: UserAccess): SearchEntry[] {
  return [
    ...listSearchableScreens(access),
    ...listSearchableManualSections(access),
  ];
}
