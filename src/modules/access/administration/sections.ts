import { CATALOG_VIEW_PERMISSIONS, type Permission } from "../permissions";
import { hasPermission, type UserAccess } from "../authorization/service";

export type AdminSection = {
  label: string;
  href: string;
  anyOfPermissions: readonly Permission[];
};

export const ADMIN_SECTIONS: readonly AdminSection[] = [
  {
    label: "Roles",
    href: "/admin/roles",
    anyOfPermissions: ["admin.roles.view"],
  },
  {
    label: "Usuarios",
    href: "/admin/usuarios",
    anyOfPermissions: ["admin.users.view"],
  },
  {
    label: "Invitaciones",
    href: "/admin/invitaciones",
    anyOfPermissions: ["admin.invitations.view"],
  },
  {
    label: "Catálogos",
    href: "/admin/catalogos",
    anyOfPermissions: CATALOG_VIEW_PERMISSIONS,
  },
];

export function getAllowedAdminSections(access: UserAccess): AdminSection[] {
  return ADMIN_SECTIONS.filter((section) =>
    section.anyOfPermissions.some((permission) =>
      hasPermission(access, permission),
    ),
  );
}
