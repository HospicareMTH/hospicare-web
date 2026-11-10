"use client";

import { Menu01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { CSSProperties, ReactNode } from "react";

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
  SidebarRail,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar";
import { TooltipProvider } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

import {
  isCurrentDestination,
  type NavigationDestination,
  NEUTRAL_ICON_CLASS_NAME,
  SECTION_ICON_CLASS_NAMES,
} from "./navigation";
import { ThemeToggle } from "./theme-toggle";

const LOGO_ALTERNATIVE_TEXT = "Hospice Madre Teresa";
const LOGO_WIDTH = 600;
const LOGO_HEIGHT = 116;
const ISOTYPE_WIDTH = 200;
const ISOTYPE_HEIGHT = 111;

const SIDEBAR_STYLE: CSSProperties & Record<"--sidebar-width-icon", string> = {
  "--sidebar-width-icon": "3.5rem",
};

export const TOGGLE_SIDEBAR_LABEL = "Contraer o expandir el menú";

const MOBILE_ITEM_CLASS_NAME =
  "group flex flex-1 p-1.5 text-sm font-medium text-sidebar-foreground outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring focus-visible:ring-inset";
const MOBILE_ITEM_SURFACE_CLASS_NAME =
  "flex h-14 flex-1 flex-col items-center justify-center gap-1 rounded-lg group-hover:bg-sidebar-accent group-aria-[current=page]:bg-primary/10 group-aria-[current=page]:font-semibold group-aria-[current=page]:text-primary";

function getIconClassName(destination: NavigationDestination) {
  return destination.color
    ? SECTION_ICON_CLASS_NAMES[destination.color]
    : NEUTRAL_ICON_CLASS_NAME;
}

function HorizontalLogo({ className }: { className: string }) {
  return (
    <>
      <Image
        src="/hmt-logos/HMT-Logo-horizontal-azul.svg"
        alt={LOGO_ALTERNATIVE_TEXT}
        width={LOGO_WIDTH}
        height={LOGO_HEIGHT}
        className={cn(className, "dark:hidden")}
      />
      <Image
        src="/hmt-logos/HMT-Logo-horizontal-blanco.svg"
        alt={LOGO_ALTERNATIVE_TEXT}
        width={LOGO_WIDTH}
        height={LOGO_HEIGHT}
        className={cn(className, "hidden dark:block")}
      />
    </>
  );
}

function SidebarBrand() {
  return (
    <Link
      href="/"
      className="flex h-12 items-center rounded-lg px-2 outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring group-data-[collapsible=icon]:px-0"
    >
      <span className="group-data-[collapsible=icon]:hidden">
        <HorizontalLogo className="h-auto w-40" />
      </span>
      <span className="hidden size-10 items-center justify-center rounded-lg bg-sidebar-primary group-data-[collapsible=icon]:flex">
        <Image
          src="/hmt-logos/HMT-Logo-blanco.svg"
          alt={LOGO_ALTERNATIVE_TEXT}
          width={ISOTYPE_WIDTH}
          height={ISOTYPE_HEIGHT}
          className="h-auto w-7"
        />
      </span>
    </Link>
  );
}

type NavigationProps = {
  destinations: NavigationDestination[];
  pathname: string;
};

function SidebarNavigation({ destinations, pathname }: NavigationProps) {
  return (
    <SidebarMenu>
      {destinations.map((destination) => (
        <SidebarMenuItem key={destination.href}>
          <SidebarMenuButton
            asChild
            isActive={isCurrentDestination(destination, pathname)}
            tooltip={destination.label}
            className="h-10 text-base data-active:bg-primary/10 data-active:font-semibold data-active:text-primary group-data-[collapsible=icon]:data-active:bg-primary/20 group-data-[collapsible=icon]:data-active:ring-1 group-data-[collapsible=icon]:data-active:ring-primary/40 group-data-[collapsible=icon]:size-10! group-data-[collapsible=icon]:p-2.5! [&_svg]:size-5"
          >
            <Link href={destination.href}>
              <HugeiconsIcon
                icon={destination.icon}
                className={getIconClassName(destination)}
                aria-hidden="true"
              />
              <span>{destination.label}</span>
            </Link>
          </SidebarMenuButton>
        </SidebarMenuItem>
      ))}
    </SidebarMenu>
  );
}

function MobileNavigation({ destinations, pathname }: NavigationProps) {
  const { setOpenMobile } = useSidebar();

  return (
    <nav
      aria-label="Navegación principal"
      className="fixed inset-x-0 bottom-0 z-20 flex border-t border-sidebar-border bg-sidebar pb-[env(safe-area-inset-bottom)] md:hidden"
    >
      {destinations
        .filter((destination) => destination.isInMobileBar)
        .map((destination) => (
          <Link
            key={destination.href}
            href={destination.href}
            aria-current={
              isCurrentDestination(destination, pathname) ? "page" : undefined
            }
            className={MOBILE_ITEM_CLASS_NAME}
          >
            <span className={MOBILE_ITEM_SURFACE_CLASS_NAME}>
              <HugeiconsIcon
                icon={destination.icon}
                className={cn("size-6", getIconClassName(destination))}
                aria-hidden="true"
              />
              {destination.label}
            </span>
          </Link>
        ))}
      <button
        type="button"
        onClick={() => setOpenMobile(true)}
        className={MOBILE_ITEM_CLASS_NAME}
      >
        <span className={MOBILE_ITEM_SURFACE_CLASS_NAME}>
          <HugeiconsIcon
            icon={Menu01Icon}
            className={cn("size-6", NEUTRAL_ICON_CLASS_NAME)}
            aria-hidden="true"
          />
          Menú
        </span>
      </button>
    </nav>
  );
}

export function AppShell({
  destinations,
  accountMenu,
  isSidebarOpenByDefault,
  children,
}: {
  destinations: NavigationDestination[];
  accountMenu: ReactNode;
  isSidebarOpenByDefault: boolean;
  children: ReactNode;
}) {
  const pathname = usePathname();

  return (
    <TooltipProvider>
      <SidebarProvider
        defaultOpen={isSidebarOpenByDefault}
        style={SIDEBAR_STYLE}
      >
        <Sidebar variant="inset" collapsible="icon">
          <SidebarHeader>
            <SidebarBrand />
          </SidebarHeader>
          <SidebarContent>
            <SidebarGroup>
              <SidebarNavigation
                destinations={destinations}
                pathname={pathname}
              />
            </SidebarGroup>
          </SidebarContent>
          <SidebarFooter>{accountMenu}</SidebarFooter>
          <SidebarRail
            aria-label={TOGGLE_SIDEBAR_LABEL}
            title={TOGGLE_SIDEBAR_LABEL}
          />
        </Sidebar>
        <SidebarInset>
          <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4">
            <SidebarTrigger
              aria-label={TOGGLE_SIDEBAR_LABEL}
              className="-ml-1 hidden size-9 md:inline-flex"
            />
            <div className="md:hidden">
              <HorizontalLogo className="h-auto w-36" />
            </div>
            <ThemeToggle className="ml-auto size-10" />
          </header>
          <main className="flex flex-1 flex-col p-4 pb-24 md:p-6">
            {children}
          </main>
        </SidebarInset>
        <MobileNavigation destinations={destinations} pathname={pathname} />
      </SidebarProvider>
    </TooltipProvider>
  );
}
