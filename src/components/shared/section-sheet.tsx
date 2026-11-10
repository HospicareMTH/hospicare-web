import { HugeiconsIcon } from "@hugeicons/react";
import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

import {
  type NavigationDestination,
  NEUTRAL_ICON_CLASS_NAME,
  SECTION_ICON_CLASS_NAMES,
} from "./navigation";

export function SectionSheet({
  destination,
  children,
}: {
  destination: NavigationDestination;
  children: ReactNode;
}) {
  const { color } = destination;

  return (
    <section className="flex flex-1 flex-col gap-6">
      <h1 className="flex items-center gap-3 text-2xl font-semibold tracking-tight">
        <HugeiconsIcon
          icon={destination.icon}
          className={cn(
            "size-7",
            color ? SECTION_ICON_CLASS_NAMES[color] : NEUTRAL_ICON_CLASS_NAME,
          )}
          aria-hidden="true"
        />
        {destination.label}
      </h1>
      {children}
    </section>
  );
}
