import { hasPermission, type UserAccess } from "@/modules/access";
import { listVisibleCatalogs } from "@/modules/catalogs";

import {
  ACCOUNT_SECTION,
  CATALOGS_SECTION,
  GENERAL_USE_SECTION,
  HOME_SECTION,
  INVITATIONS_SECTION,
  type ManualSection,
  ROLES_SECTION,
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
      hasPermission(access, "dashboard.data_quality.view"),
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
];

export function listVisibleManualSections(access: UserAccess): ManualSection[] {
  return MANUAL_ENTRIES.filter((entry) => entry.isVisibleTo(access)).map(
    (entry) => entry.section,
  );
}
