"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { Button } from "@/components/ui/button";

import type { AdminSectionLink } from "../admin-sections";

export function AdminSectionNav({
  sections,
}: {
  sections: AdminSectionLink[];
}) {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Secciones de Administración"
      className="-mx-1 flex gap-1 overflow-x-auto border-b px-1 pb-2"
    >
      {sections.map((section) => {
        const isCurrent = pathname === section.href;
        return (
          <Button
            key={section.href}
            asChild
            variant="ghost"
            className="h-10 shrink-0 px-4 text-base aria-[current=page]:bg-primary/10 aria-[current=page]:font-semibold aria-[current=page]:text-primary"
          >
            <Link
              href={section.href}
              aria-current={isCurrent ? "page" : undefined}
            >
              {section.label}
            </Link>
          </Button>
        );
      })}
    </nav>
  );
}
