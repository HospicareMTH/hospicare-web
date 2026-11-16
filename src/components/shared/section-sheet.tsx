import { HugeiconsIcon } from "@hugeicons/react";
import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

import {
  type NavigationDestination,
  NEUTRAL_ICON_CLASS_NAME,
  SECTION_ICON_CLASS_NAMES,
} from "./navigation";

const STICKY_TITLE_CLASS_NAME =
  "sticky -top-4 z-10 -mx-4 -mt-4 bg-background px-4 pt-4 pb-4 md:-top-6 md:-mx-6 md:-mt-6 md:px-6 md:pt-6";

export function SectionSheet({
  destination,
  title = destination.label,
  isTitleSticky = false,
  children,
}: {
  destination: NavigationDestination;
  title?: string;
  isTitleSticky?: boolean;
  children: ReactNode;
}) {
  const { color } = destination;

  return (
    <section className="flex flex-1 flex-col gap-6">
      <h1
        className={cn(
          "flex items-center gap-3 text-2xl font-semibold tracking-tight",
          isTitleSticky && STICKY_TITLE_CLASS_NAME,
        )}
      >
        <HugeiconsIcon
          icon={destination.icon}
          className={cn(
            "size-7",
            color ? SECTION_ICON_CLASS_NAMES[color] : NEUTRAL_ICON_CLASS_NAME,
          )}
          aria-hidden="true"
        />
        {title}
      </h1>
      {children}
    </section>
  );
}
