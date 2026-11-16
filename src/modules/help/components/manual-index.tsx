"use client";

import { ArrowDown01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

export type ManualIndexEntry = { title: string; href: string };

export function ManualIndex({ entries }: { entries: ManualIndexEntry[] }) {
  const [isOpen, setIsOpen] = useState(false);
  const pathname = usePathname();

  return (
    <nav aria-label="Secciones del manual" className="lg:sticky lg:top-14">
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CollapsibleTrigger asChild>
          <Button
            variant="outline"
            className="h-11 w-full justify-between text-base lg:hidden"
          >
            Secciones del manual
            <HugeiconsIcon
              icon={ArrowDown01Icon}
              data-icon="inline-end"
              className="transition-transform duration-200 ease-out data-[open=true]:rotate-180"
              data-open={isOpen}
              aria-hidden="true"
            />
          </Button>
        </CollapsibleTrigger>
        <CollapsibleContent
          forceMount
          className="mt-2 data-[state=closed]:hidden lg:mt-0 lg:data-[state=closed]:block"
        >
          <p className="hidden px-3 pb-2 text-sm font-medium text-muted-foreground lg:block">
            En este manual
          </p>
          <ul className="flex flex-col gap-1">
            {entries.map((entry) => (
              <li key={entry.href}>
                <Link
                  href={entry.href}
                  aria-current={pathname === entry.href ? "page" : undefined}
                  onClick={() => setIsOpen(false)}
                  className="block rounded-lg px-3 py-2 text-base text-foreground transition-colors hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none aria-[current=page]:bg-primary/10 aria-[current=page]:font-semibold aria-[current=page]:text-primary"
                >
                  {entry.title}
                </Link>
              </li>
            ))}
          </ul>
        </CollapsibleContent>
      </Collapsible>
    </nav>
  );
}
