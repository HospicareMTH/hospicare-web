"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useLayoutEffect, useRef } from "react";

import { Button } from "@/components/ui/button";

import type { AdminSection } from "../sections";

const CURRENT_SECTION_SELECTOR = '[aria-current="page"]';

function centerCurrentSection(navigation: HTMLElement) {
  const currentSection = navigation.querySelector<HTMLElement>(
    CURRENT_SECTION_SELECTOR,
  );
  if (!currentSection) {
    return;
  }
  const navigationBounds = navigation.getBoundingClientRect();
  const sectionBounds = currentSection.getBoundingClientRect();
  const sectionCenter = sectionBounds.left + sectionBounds.width / 2;
  const navigationCenter = navigationBounds.left + navigationBounds.width / 2;
  navigation.scrollLeft += sectionCenter - navigationCenter;
}

export function AdminSectionNav({ sections }: { sections: AdminSection[] }) {
  const pathname = usePathname();
  const navigationRef = useRef<HTMLElement>(null);

  useLayoutEffect(() => {
    if (navigationRef.current) {
      centerCurrentSection(navigationRef.current);
    }
  }, [pathname]);

  return (
    <nav
      ref={navigationRef}
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
