import type { Metadata } from "next";

import { GUESTS_DESTINATION } from "@/components/shared/navigation";
import { SectionSheet } from "@/components/shared/section-sheet";
import { NewGuestScreen } from "@/modules/guests";

export const metadata: Metadata = {
  title: "Nuevo huésped",
  description: "Alta de un huésped sin entrevista de admisión.",
  robots: { index: false, follow: false },
};

export default function NewGuestPage() {
  return (
    <SectionSheet destination={GUESTS_DESTINATION} title="Nuevo huésped">
      <NewGuestScreen />
    </SectionSheet>
  );
}
