import { Analytics01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import type { Metadata } from "next";

import { HOME_DESTINATION } from "@/components/shared/navigation";
import { SectionSheet } from "@/components/shared/section-sheet";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
} from "@/components/ui/empty";

export const metadata: Metadata = {
  title: "Inicio",
  description: "Reportes operativos del Hospice Madre Teresa.",
};

export default function HomePage() {
  return (
    <SectionSheet destination={HOME_DESTINATION}>
      <Empty className="flex-1 rounded-xl border border-dashed border-input/60">
        <EmptyHeader>
          <EmptyMedia
            variant="icon"
            className="size-12 rounded-full text-primary"
          >
            <HugeiconsIcon
              icon={Analytics01Icon}
              className="size-6"
              aria-hidden="true"
            />
          </EmptyMedia>
          <EmptyDescription className="text-base text-foreground">
            Todavía no hay reportes para mostrar.
          </EmptyDescription>
        </EmptyHeader>
      </Empty>
    </SectionSheet>
  );
}
