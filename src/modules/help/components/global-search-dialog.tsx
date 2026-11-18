"use client";

import { Search01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { useRouter } from "next/navigation";
import { useEffect, useState, useSyncExternalStore } from "react";

import { NEUTRAL_ICON_CLASS_NAME } from "@/components/shared/navigation";
import {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Kbd, KbdGroup } from "@/components/ui/kbd";
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import { normalizeForSearch } from "@/platform/list-query";

import type { SearchEntry, SearchEntryGroup } from "../service";

const SEARCH_LABEL = "Buscar";
const SHORTCUT_KEY = "k";
const APPLE_PLATFORM_PATTERN = /Mac|iPhone|iPad/;
const MATCH = 1;
const NO_MATCH = 0;

const GROUP_HEADINGS: Record<SearchEntryGroup, string> = {
  screens: "Pantallas",
  manual: "Manual",
};

const GROUPS: readonly SearchEntryGroup[] = ["screens", "manual"];

function subscribeToPlatform(): () => void {
  return () => {};
}

function isApplePlatform(): boolean {
  return APPLE_PLATFORM_PATTERN.test(navigator.userAgent);
}

function isNotApplePlatform(): boolean {
  return false;
}

function matchEntryLabel(
  _value: string,
  search: string,
  keywords?: string[],
): number {
  const label = normalizeForSearch((keywords ?? []).join(" "));
  return label.includes(normalizeForSearch(search)) ? MATCH : NO_MATCH;
}

function isSearchShortcut(event: KeyboardEvent): boolean {
  return (
    event.key.toLowerCase() === SHORTCUT_KEY && (event.metaKey || event.ctrlKey)
  );
}

export function GlobalSearchDialog({ entries }: { entries: SearchEntry[] }) {
  const router = useRouter();
  const { setOpenMobile } = useSidebar();
  const [isOpen, setIsOpen] = useState(false);
  const isApple = useSyncExternalStore(
    subscribeToPlatform,
    isApplePlatform,
    isNotApplePlatform,
  );

  useEffect(() => {
    function toggleOnShortcut(event: KeyboardEvent) {
      if (!isSearchShortcut(event)) {
        return;
      }
      event.preventDefault();
      setIsOpen((wasOpen) => !wasOpen);
    }
    document.addEventListener("keydown", toggleOnShortcut);
    return () => document.removeEventListener("keydown", toggleOnShortcut);
  }, []);

  function openEntry(href: string) {
    setIsOpen(false);
    setOpenMobile(false);
    router.push(href);
  }

  return (
    <>
      <SidebarMenu>
        <SidebarMenuItem>
          <SidebarMenuButton
            onClick={() => setIsOpen(true)}
            tooltip={SEARCH_LABEL}
            aria-keyshortcuts={isApple ? "Meta+K" : "Control+K"}
            className="h-10 text-base group-data-[collapsible=icon]:size-10! group-data-[collapsible=icon]:p-2.5! [&_svg]:size-5"
          >
            <HugeiconsIcon
              icon={Search01Icon}
              className={NEUTRAL_ICON_CLASS_NAME}
              aria-hidden="true"
            />
            <span>{SEARCH_LABEL}</span>
            <KbdGroup
              aria-hidden="true"
              className="ml-auto hidden md:inline-flex group-data-[collapsible=icon]:hidden"
            >
              <Kbd>{isApple ? "⌘" : "Ctrl"}</Kbd>
              <Kbd>K</Kbd>
            </KbdGroup>
          </SidebarMenuButton>
        </SidebarMenuItem>
      </SidebarMenu>
      <CommandDialog
        open={isOpen}
        onOpenChange={setIsOpen}
        title={SEARCH_LABEL}
        description="Buscá una pantalla o una sección del manual."
      >
        <Command filter={matchEntryLabel}>
          <CommandInput
            placeholder="Buscar pantallas o ayuda"
            className="text-base"
          />
          <CommandList>
            <CommandEmpty className="text-base">
              No encontramos nada con ese nombre.
            </CommandEmpty>
            {GROUPS.map((group) => (
              <CommandGroup
                key={group}
                heading={GROUP_HEADINGS[group]}
                className="**:[[cmdk-group-heading]]:text-sm"
              >
                {entries
                  .filter((entry) => entry.group === group)
                  .map((entry) => (
                    <CommandItem
                      key={entry.href}
                      value={entry.href}
                      keywords={[entry.label]}
                      onSelect={openEntry}
                      className="h-10 text-base"
                    >
                      {entry.label}
                    </CommandItem>
                  ))}
              </CommandGroup>
            ))}
          </CommandList>
        </Command>
      </CommandDialog>
    </>
  );
}
