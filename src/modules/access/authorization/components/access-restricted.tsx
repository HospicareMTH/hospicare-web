import { SquareLock02Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import Link from "next/link";

import { HOME_DESTINATION } from "@/components/shared/navigation";
import { Button } from "@/components/ui/button";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";

export function AccessRestricted() {
  return (
    <Empty className="flex-1 rounded-xl border border-dashed border-input/60">
      <EmptyHeader>
        <EmptyMedia
          variant="icon"
          className="size-12 rounded-full text-primary"
        >
          <HugeiconsIcon
            icon={SquareLock02Icon}
            className="size-6"
            aria-hidden="true"
          />
        </EmptyMedia>
        <EmptyTitle className="text-xl">
          <h1>Acceso restringido</h1>
        </EmptyTitle>
        <EmptyDescription className="text-base text-foreground">
          No tenés acceso a esta sección. Si lo necesitás, pedíselo a un
          administrador.
        </EmptyDescription>
      </EmptyHeader>
      <EmptyContent>
        <Button asChild size="lg">
          <Link href={HOME_DESTINATION.href}>Ir al inicio</Link>
        </Button>
      </EmptyContent>
    </Empty>
  );
}
