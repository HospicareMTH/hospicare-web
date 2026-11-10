import { Home01Icon } from "@hugeicons/core-free-icons";
import type { IconSvgElement } from "@hugeicons/react";

export type SectionColor = "blue" | "green" | "ochre" | "plum";

export type NavigationDestination = {
  label: string;
  href: string;
  icon: IconSvgElement;
  color: SectionColor | null;
  isInMobileBar: boolean;
};

export const HOME_DESTINATION: NavigationDestination = {
  label: "Inicio",
  href: "/",
  icon: Home01Icon,
  color: "blue",
  isInMobileBar: true,
};

export const NAVIGATION_DESTINATIONS: NavigationDestination[] = [
  HOME_DESTINATION,
];

export const SECTION_FILL_CLASS_NAMES: Record<SectionColor, string> = {
  blue: "bg-section-blue text-section-on-dark",
  green: "bg-section-green text-section-on-dark",
  ochre: "bg-section-ochre text-section-on-light",
  plum: "bg-section-plum text-section-on-dark",
};

export const SECTION_STRIP_CLASS_NAMES: Record<SectionColor, string> = {
  blue: "bg-section-blue",
  green: "bg-section-green",
  ochre: "bg-section-ochre",
  plum: "bg-section-plum",
};

export const SECTION_TINT_CLASS_NAMES: Record<SectionColor, string> = {
  blue: "bg-section-blue/12 text-section-blue",
  green: "bg-section-green/12 text-section-green",
  ochre: "bg-section-ochre/12 text-section-ochre",
  plum: "bg-section-plum/12 text-section-plum",
};

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
