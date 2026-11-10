import { Home01Icon, UserShield01Icon } from "@hugeicons/core-free-icons";
import type { IconSvgElement } from "@hugeicons/react";

export type SectionColor = "blue" | "green" | "ochre" | "plum";

export type NavigationDestination = {
  label: string;
  href: string;
  icon: IconSvgElement;
  color: SectionColor | null;
  isInMobileBar: boolean;
  requiredPermission: string | null;
};

export const HOME_DESTINATION: NavigationDestination = {
  label: "Inicio",
  href: "/",
  icon: Home01Icon,
  color: "blue",
  isInMobileBar: true,
  requiredPermission: null,
};

export const ADMINISTRATION_DESTINATION: NavigationDestination = {
  label: "Administración",
  href: "/admin/roles",
  icon: UserShield01Icon,
  color: null,
  isInMobileBar: false,
  requiredPermission: "admin.roles.view",
};

export const NAVIGATION_DESTINATIONS: NavigationDestination[] = [
  HOME_DESTINATION,
  ADMINISTRATION_DESTINATION,
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
  const sectionPath = destination.href.split("/").slice(0, 2).join("/");
  return pathname === sectionPath || pathname.startsWith(`${sectionPath}/`);
}
