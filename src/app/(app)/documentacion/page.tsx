import type { Metadata } from "next";

import { ManualHome } from "@/modules/help";

export const metadata: Metadata = {
  title: "Documentación",
  description:
    "Manual de uso de Hospicare: qué hace cada función y cómo se usa.",
  robots: { index: false, follow: false },
};

export default function DocumentationPage() {
  return <ManualHome />;
}
