import type { Permission } from "../permissions";
import { hasPermission, type UserAccess } from "../authorization/service";

export type AdminSection = {
  label: string;
  href: string;
  permission: Permission;
};

export const ADMIN_SECTIONS: readonly AdminSection[] = [
  { label: "Roles", href: "/admin/roles", permission: "admin.roles.view" },
  {
    label: "Usuarios",
    href: "/admin/usuarios",
    permission: "admin.users.view",
  },
  {
    label: "Invitaciones",
    href: "/admin/invitaciones",
    permission: "admin.invitations.view",
  },
];

export function getAllowedAdminSections(access: UserAccess): AdminSection[] {
  return ADMIN_SECTIONS.filter((section) =>
    hasPermission(access, section.permission),
  );
}
