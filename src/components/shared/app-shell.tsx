"use client";

import { Menu01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  useSidebar,
} from "@/components/ui/sidebar";
import { cn } from "@/lib/utils";

import {
  isCurrentDestination,
  NAVIGATION_DESTINATIONS,
  type NavigationDestination,
  SECTION_FILL_CLASS_NAMES,
} from "./navigation";
import { ThemeToggle } from "./theme-toggle";

const LOGO_ALTERNATIVE_TEXT = "Hospice Madre Teresa";
const LOGO_WIDTH = 600;
const LOGO_HEIGHT = 116;
const NEUTRAL_CHIP_CLASS_NAME = "bg-white/12 text-sidebar-foreground";
const CHIP_CLASS_NAME =
  "flex size-9 shrink-0 items-center justify-center rounded-lg ring-2 ring-white/30";

const MOBILE_ITEM_CLASS_NAME =
  "flex flex-1 p-1.5 text-base font-medium outline-none hover:bg-white/12 focus-visible:ring-2 focus-visible:ring-sidebar-ring focus-visible:ring-inset";

export const SIDEBAR_ITEM_INTERACTION_CLASS_NAME =
  "hover:bg-white/12 hover:text-sidebar-foreground data-active:hover:bg-sidebar-accent data-active:hover:text-sidebar-accent-foreground focus-visible:ring-offset-2 focus-visible:ring-offset-sidebar";

function DestinationChip({
  destination,
}: {
  destination: NavigationDestination;
}) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        CHIP_CLASS_NAME,
        destination.color
          ? SECTION_FILL_CLASS_NAMES[destination.color]
          : NEUTRAL_CHIP_CLASS_NAME,
      )}
    >
      <HugeiconsIcon icon={destination.icon} className="size-5" />
    </span>
  );
}

function SidebarNavigation({ pathname }: { pathname: string }) {
  return (
    <SidebarMenu className="gap-1.5">
      {NAVIGATION_DESTINATIONS.map((destination) => (
        <SidebarMenuItem key={destination.href}>
          <SidebarMenuButton
            asChild
            size="lg"
            isActive={isCurrentDestination(destination, pathname)}
            className={cn(
              "h-13 gap-3 text-base font-medium data-active:font-semibold",
              SIDEBAR_ITEM_INTERACTION_CLASS_NAME,
            )}
          >
            <Link href={destination.href}>
              <DestinationChip destination={destination} />
              <span>{destination.label}</span>
            </Link>
          </SidebarMenuButton>
        </SidebarMenuItem>
      ))}
    </SidebarMenu>
  );
}

function MobileNavigation({ pathname }: { pathname: string }) {
  const { setOpenMobile } = useSidebar();

  return (
    <nav
      aria-label="Navegación principal"
      className="fixed inset-x-0 bottom-0 z-20 flex border-t border-sidebar-border bg-sidebar pb-[env(safe-area-inset-bottom)] text-sidebar-foreground md:hidden"
    >
      {NAVIGATION_DESTINATIONS.filter(
        (destination) => destination.isInMobileBar,
      ).map((destination) => (
        <Link
          key={destination.href}
          href={destination.href}
          aria-current={
            isCurrentDestination(destination, pathname) ? "page" : undefined
          }
          className={cn(MOBILE_ITEM_CLASS_NAME, "group")}
        >
          <span className="flex h-13 flex-1 items-center justify-center gap-2.5 rounded-lg group-aria-[current=page]:bg-sidebar-accent group-aria-[current=page]:font-semibold group-aria-[current=page]:text-sidebar-accent-foreground">
            <DestinationChip destination={destination} />
            {destination.label}
          </span>
        </Link>
      ))}
      <button
        type="button"
        onClick={() => setOpenMobile(true)}
        className={MOBILE_ITEM_CLASS_NAME}
      >
        <span className="flex h-13 flex-1 items-center justify-center gap-2.5 rounded-lg">
          <span
            aria-hidden="true"
            className={cn(CHIP_CLASS_NAME, NEUTRAL_CHIP_CLASS_NAME)}
          >
            <HugeiconsIcon icon={Menu01Icon} className="size-5" />
          </span>
          Menú
        </span>
      </button>
    </nav>
  );
}

export function AppShell({
  accountMenu,
  children,
}: {
  accountMenu: ReactNode;
  children: ReactNode;
}) {
  const pathname = usePathname();

  return (
    <SidebarProvider>
      <Sidebar collapsible="offcanvas">
        <SidebarHeader className="px-4 pt-6 pb-6">
          <Image
            src="/hmt-logos/HMT-Logo-horizontal-blanco.svg"
            alt={LOGO_ALTERNATIVE_TEXT}
            width={LOGO_WIDTH}
            height={LOGO_HEIGHT}
            className="h-auto w-48"
          />
        </SidebarHeader>
        <SidebarContent>
          <SidebarGroup>
            <SidebarNavigation pathname={pathname} />
          </SidebarGroup>
        </SidebarContent>
        <SidebarFooter className="border-t border-sidebar-border">
          {accountMenu}
        </SidebarFooter>
      </Sidebar>
      <SidebarInset className="bg-muted">
        <header className="flex h-20 items-center justify-between gap-4 px-4 md:justify-end md:px-9">
          <Image
            src="/hmt-logos/HMT-Logo-horizontal-azul.svg"
            alt={LOGO_ALTERNATIVE_TEXT}
            width={LOGO_WIDTH}
            height={LOGO_HEIGHT}
            className="h-auto w-40 md:hidden dark:hidden"
          />
          <Image
            src="/hmt-logos/HMT-Logo-horizontal-blanco.svg"
            alt={LOGO_ALTERNATIVE_TEXT}
            width={LOGO_WIDTH}
            height={LOGO_HEIGHT}
            className="hidden h-auto w-40 dark:block md:dark:hidden"
          />
          <ThemeToggle className="size-11" />
        </header>
        <main className="flex flex-1 flex-col px-4 pb-24 md:px-9 md:pb-8">
          {children}
        </main>
      </SidebarInset>
      <MobileNavigation pathname={pathname} />
    </SidebarProvider>
  );
}
