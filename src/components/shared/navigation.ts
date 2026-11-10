import {
  Home01Icon,
  UserCircleIcon,
  UserShield01Icon,
} from "@hugeicons/core-free-icons";
import type { IconSvgElement } from "@hugeicons/react";

export type SectionColor = "blue" | "green" | "ochre" | "plum";

export type NavigationDestination = {
  label: string;
  href: string;
  icon: IconSvgElement;
  color: SectionColor | null;
  isInMobileBar: boolean;
  requiredPermissions: string[];
};

export const HOME_DESTINATION: NavigationDestination = {
  label: "Inicio",
  href: "/",
  icon: Home01Icon,
  color: "blue",
  isInMobileBar: true,
  requiredPermissions: [],
};

export const ADMINISTRATION_DESTINATION: NavigationDestination = {
  label: "Administración",
  href: "/admin",
  icon: UserShield01Icon,
  color: null,
  isInMobileBar: false,
  requiredPermissions: [
    "admin.roles.view",
    "admin.users.view",
    "admin.invitations.view",
  ],
};

export const ACCOUNT_DESTINATION: NavigationDestination = {
  label: "Mi cuenta",
  href: "/usuario",
  icon: UserCircleIcon,
  color: null,
  isInMobileBar: false,
  requiredPermissions: [],
};

export const NAVIGATION_DESTINATIONS: NavigationDestination[] = [
  HOME_DESTINATION,
  ADMINISTRATION_DESTINATION,
  ACCOUNT_DESTINATION,
];

export const SECTION_ICON_CLASS_NAMES: Record<SectionColor, string> = {
  blue: "text-section-blue",
  green: "text-section-green",
  ochre: "text-section-ochre",
  plum: "text-section-plum",
};

export const NEUTRAL_ICON_CLASS_NAME = "text-sidebar-foreground";

export function isCurrentDestination(
  destination: NavigationDestination,
  pathname: string,
) {
  if (destination.href === "/") {
    return pathname === "/";
  }
  return (
    pathname === destination.href || pathname.startsWith(`${destination.href}/`)
  );
}
