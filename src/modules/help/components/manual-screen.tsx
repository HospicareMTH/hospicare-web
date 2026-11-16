import { Fragment, Suspense } from "react";

import { LoadingStatus } from "@/components/shared/loading-status";
import { DOCUMENTATION_DESTINATION } from "@/components/shared/navigation";
import { SectionSheet } from "@/components/shared/section-sheet";
import { Separator } from "@/components/ui/separator";
import { requirePermission } from "@/modules/access";

import { listVisibleManualSections } from "../service";
import { ManualIndex } from "./manual-index";
import { ManualSectionArticle } from "./manual-section-article";

async function ManualContent() {
  const { access } = await requirePermission("documentation.app.view");
  const sections = listVisibleManualSections(access);

  return (
    <div className="grid gap-8 lg:grid-cols-[15rem_minmax(0,1fr)] lg:items-start">
      <ManualIndex entries={sections.map(({ id, title }) => ({ id, title }))} />
      <div className="flex max-w-[70ch] flex-col gap-10">
        {sections.map((section, index) => (
          <Fragment key={section.id}>
            {index > 0 && <Separator />}
            <ManualSectionArticle section={section} />
          </Fragment>
        ))}
      </div>
    </div>
  );
}

export function ManualScreen() {
  return (
    <SectionSheet destination={DOCUMENTATION_DESTINATION}>
      <Suspense fallback={<LoadingStatus label="Cargando el manual…" />}>
        <ManualContent />
      </Suspense>
    </SectionSheet>
  );
}
