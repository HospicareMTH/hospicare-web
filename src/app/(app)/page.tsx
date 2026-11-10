import { Analytics01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import type { Metadata } from "next";

import {
  HOME_DESTINATION,
  SECTION_TINT_CLASS_NAMES,
} from "@/components/shared/navigation";
import { SectionSheet } from "@/components/shared/section-sheet";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
} from "@/components/ui/empty";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Inicio",
  description: "Reportes operativos del Hospice Madre Teresa.",
};

export default function HomePage() {
  return (
    <SectionSheet destination={HOME_DESTINATION}>
      <Empty className="flex-1">
        <EmptyHeader>
          <EmptyMedia
            variant="icon"
            className={cn(
              "size-14 rounded-xl",
              HOME_DESTINATION.color &&
                SECTION_TINT_CLASS_NAMES[HOME_DESTINATION.color],
            )}
          >
            <HugeiconsIcon
              icon={Analytics01Icon}
              className="size-7"
              aria-hidden="true"
            />
          </EmptyMedia>
          <EmptyDescription className="text-lg text-foreground">
            Todavía no hay reportes para mostrar.
          </EmptyDescription>
        </EmptyHeader>
      </Empty>
    </SectionSheet>
  );
}
