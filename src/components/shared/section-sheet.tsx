import { HugeiconsIcon } from "@hugeicons/react";
import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

import {
  type NavigationDestination,
  SECTION_FILL_CLASS_NAMES,
  SECTION_STRIP_CLASS_NAMES,
} from "./navigation";

const NEUTRAL_LABEL_CLASS_NAME = "bg-card text-card-foreground";
const NEUTRAL_STRIP_CLASS_NAME = "bg-border";

export function SectionSheet({
  destination,
  children,
}: {
  destination: NavigationDestination;
  children: ReactNode;
}) {
  const { color } = destination;

  return (
    <section className="flex flex-1 flex-col">
      <h1
        className={cn(
          "flex h-13 w-fit items-center gap-3 rounded-t-xl px-6 text-2xl font-semibold",
          color ? SECTION_FILL_CLASS_NAMES[color] : NEUTRAL_LABEL_CLASS_NAME,
        )}
      >
        <HugeiconsIcon
          icon={destination.icon}
          className="size-6"
          aria-hidden="true"
        />
        {destination.label}
      </h1>
      <div className="flex flex-1 flex-col overflow-hidden rounded-xl rounded-tl-none bg-card text-card-foreground shadow-[0_14px_34px_rgb(11_59_102/0.1)]">
        <div
          aria-hidden="true"
          className={cn(
            "h-1 shrink-0",
            color ? SECTION_STRIP_CLASS_NAMES[color] : NEUTRAL_STRIP_CLASS_NAME,
          )}
        />
        {children}
      </div>
    </section>
  );
}
