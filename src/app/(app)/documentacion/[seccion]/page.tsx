import type { Metadata } from "next";

import { findManualSectionTitle, ManualSectionScreen } from "@/modules/help";

const DOCUMENTATION_TITLE = "Documentación";

export async function generateMetadata({
  params,
}: PageProps<"/documentacion/[seccion]">): Promise<Metadata> {
  const { seccion } = await params;
  const sectionTitle = findManualSectionTitle(seccion);
  return {
    title: sectionTitle
      ? `${DOCUMENTATION_TITLE}: ${sectionTitle}`
      : DOCUMENTATION_TITLE,
    robots: { index: false, follow: false },
  };
}

export default function DocumentationSectionPage({
  params,
}: PageProps<"/documentacion/[seccion]">) {
  return (
    <ManualSectionScreen sectionId={params.then(({ seccion }) => seccion)} />
  );
}
