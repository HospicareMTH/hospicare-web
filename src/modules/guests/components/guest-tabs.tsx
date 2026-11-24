"use client";

import { type ReactNode, useState } from "react";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

import {
  DEFAULT_GUEST_TAB,
  GUEST_TAB_PARAMETER,
  type GuestTab,
} from "../schemas";

export type GuestTabPanel = {
  value: GuestTab;
  label: string;
  content: ReactNode;
};

// RF-HUE-04: la pestaña activa queda en la dirección sin volver a cargar la ficha.
function keepTabInAddress(tab: GuestTab) {
  const url = new URL(window.location.href);
  if (tab === DEFAULT_GUEST_TAB) {
    url.searchParams.delete(GUEST_TAB_PARAMETER);
  } else {
    url.searchParams.set(GUEST_TAB_PARAMETER, tab);
  }
  window.history.replaceState(null, "", url);
}

export function GuestTabs({
  initialTab,
  panels,
}: {
  initialTab: GuestTab;
  panels: GuestTabPanel[];
}) {
  const [activeTab, setActiveTab] = useState<string>(initialTab);

  function changeTab(nextTab: string) {
    const panel = panels.find(({ value }) => value === nextTab);
    if (!panel) {
      return;
    }
    setActiveTab(panel.value);
    keepTabInAddress(panel.value);
  }

  return (
    <Tabs value={activeTab} onValueChange={changeTab} className="gap-6">
      <TabsList variant="line" className="h-auto max-w-full gap-0 sm:gap-1">
        {panels.map(({ value, label }) => (
          <TabsTrigger
            key={value}
            value={value}
            className="h-10 px-2 text-sm sm:px-3 sm:text-base"
          >
            {label}
          </TabsTrigger>
        ))}
      </TabsList>
      {panels.map(({ value, content }) => (
        <TabsContent key={value} value={value} className="text-base">
          {content}
        </TabsContent>
      ))}
    </Tabs>
  );
}
