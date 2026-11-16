import { forbidden, redirect } from "next/navigation";
import { type ReactNode, Suspense } from "react";

import { LoadingStatus } from "@/components/shared/loading-status";
import { DOCUMENTATION_DESTINATION } from "@/components/shared/navigation";
import { SectionSheet } from "@/components/shared/section-sheet";
import { requirePermission } from "@/modules/access";

import {
  findVisibleManualSection,
  listVisibleManualSections,
} from "../service";
import { ManualIndex } from "./manual-index";
import { ManualSectionArticle } from "./manual-section-article";

export function buildManualSectionHref(sectionId: string): string {
  return `${DOCUMENTATION_DESTINATION.href}/${sectionId}`;
}

async function VisibleManualIndex() {
  const { access } = await requirePermission("documentation.app.view");
  const entries = listVisibleManualSections(access).map(({ id, title }) => ({
    title,
    href: buildManualSectionHref(id),
  }));
  return <ManualIndex entries={entries} />;
}

export function ManualLayout({ children }: { children: ReactNode }) {
  return (
    <SectionSheet destination={DOCUMENTATION_DESTINATION} isTitleSticky>
      <div className="grid gap-8 lg:grid-cols-[15rem_minmax(0,1fr)] lg:items-start">
        <Suspense fallback={null}>
          <VisibleManualIndex />
        </Suspense>
        <div className="max-w-[70ch]">{children}</div>
      </div>
    </SectionSheet>
  );
}

async function RedirectToFirstManualSection(): Promise<never> {
  const { access } = await requirePermission("documentation.app.view");
  const [firstSection] = listVisibleManualSections(access);
  if (!firstSection) {
    forbidden();
  }
  redirect(buildManualSectionHref(firstSection.id));
}

export function ManualHome() {
  return (
    <Suspense fallback={null}>
      <RedirectToFirstManualSection />
    </Suspense>
  );
}

async function ManualSectionContent({
  sectionId,
}: {
  sectionId: Promise<string>;
}) {
  const { access } = await requirePermission("documentation.app.view");
  const lookup = findVisibleManualSection(access, await sectionId);
  if (lookup.status === "missing") {
    redirect(DOCUMENTATION_DESTINATION.href);
  }
  if (lookup.status === "forbidden") {
    forbidden();
  }
  return <ManualSectionArticle section={lookup.section} />;
}

export function ManualSectionScreen({
  sectionId,
}: {
  sectionId: Promise<string>;
}) {
  return (
    <Suspense fallback={<LoadingStatus label="Cargando el manual…" />}>
      <ManualSectionContent sectionId={sectionId} />
    </Suspense>
  );
}
