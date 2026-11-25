import type { Metadata } from "next";

import { GUESTS_DESTINATION } from "@/components/shared/navigation";
import { SectionSheet } from "@/components/shared/section-sheet";
import { GuestsScreen } from "@/modules/guests";

export const metadata: Metadata = {
  title: "Huéspedes",
  description:
    "Personas internadas en el hospice, con su número de historia clínica.",
  robots: { index: false, follow: false },
};

export default function GuestsPage({ searchParams }: PageProps<"/huespedes">) {
  return (
    <SectionSheet destination={GUESTS_DESTINATION}>
      <GuestsScreen searchParams={searchParams} />
    </SectionSheet>
  );
}
