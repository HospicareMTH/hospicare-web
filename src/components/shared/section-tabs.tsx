"use client";

import { AlertCircleIcon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { type KeyboardEvent, type ReactNode, useRef } from "react";

import { Button } from "@/components/ui/button";

export type SectionTab<TabId extends string> = {
  id: TabId;
  label: string;
  hasErrors: boolean;
};

const TAB_ERRORS_DESCRIPTION = ", tiene datos para corregir";
const NEXT_TAB_KEYS = new Set(["ArrowRight", "ArrowDown"]);
const PREVIOUS_TAB_KEYS = new Set(["ArrowLeft", "ArrowUp"]);

function tabElementId(idPrefix: string, tabId: string): string {
  return `${idPrefix}-tab-${tabId}`;
}

function panelElementId(idPrefix: string, tabId: string): string {
  return `${idPrefix}-panel-${tabId}`;
}

function findTargetIndex(
  key: string,
  currentIndex: number,
  tabCount: number,
): number | null {
  if (NEXT_TAB_KEYS.has(key)) {
    return (currentIndex + 1) % tabCount;
  }
  if (PREVIOUS_TAB_KEYS.has(key)) {
    return (currentIndex - 1 + tabCount) % tabCount;
  }
  if (key === "Home") {
    return 0;
  }
  if (key === "End") {
    return tabCount - 1;
  }
  return null;
}

export function SectionTabs<TabId extends string>({
  idPrefix,
  label,
  tabs,
  activeTabId,
  onActiveTabChange,
}: {
  idPrefix: string;
  label: string;
  tabs: SectionTab<TabId>[];
  activeTabId: TabId;
  onActiveTabChange: (tabId: TabId) => void;
}) {
  const tabElements = useRef(new Map<TabId, HTMLButtonElement>());

  function moveFocus(event: KeyboardEvent, currentIndex: number) {
    const targetIndex = findTargetIndex(event.key, currentIndex, tabs.length);
    const targetTab = targetIndex === null ? undefined : tabs[targetIndex];
    if (!targetTab) {
      return;
    }
    event.preventDefault();
    onActiveTabChange(targetTab.id);
    tabElements.current.get(targetTab.id)?.focus();
  }

  return (
    <div
      role="tablist"
      aria-label={label}
      className="-mx-1 flex gap-1 overflow-x-auto border-b px-1 pb-2"
    >
      {tabs.map((tab, index) => {
        const isActive = tab.id === activeTabId;
        return (
          <Button
            key={tab.id}
            ref={(element) => {
              if (element) {
                tabElements.current.set(tab.id, element);
                return;
              }
              tabElements.current.delete(tab.id);
            }}
            type="button"
            role="tab"
            id={tabElementId(idPrefix, tab.id)}
            aria-label={
              tab.hasErrors
                ? `${tab.label}${TAB_ERRORS_DESCRIPTION}`
                : undefined
            }
            aria-selected={isActive}
            aria-controls={panelElementId(idPrefix, tab.id)}
            tabIndex={isActive ? 0 : -1}
            variant="ghost"
            onClick={() => onActiveTabChange(tab.id)}
            onKeyDown={(event) => moveFocus(event, index)}
            className="h-10 shrink-0 px-4 text-base aria-selected:bg-primary/10 aria-selected:font-semibold aria-selected:text-primary"
          >
            {tab.label}
            {tab.hasErrors && (
              <HugeiconsIcon
                icon={AlertCircleIcon}
                className="text-destructive"
                aria-hidden="true"
              />
            )}
          </Button>
        );
      })}
    </div>
  );
}

export function SectionTabPanel({
  idPrefix,
  tabId,
  activeTabId,
  children,
}: {
  idPrefix: string;
  tabId: string;
  activeTabId: string;
  children: ReactNode;
}) {
  return (
    <div
      role="tabpanel"
      id={panelElementId(idPrefix, tabId)}
      aria-labelledby={tabElementId(idPrefix, tabId)}
      hidden={tabId !== activeTabId}
    >
      {children}
    </div>
  );
}
