import type { Metadata } from "next";

import { ADMISSIONS_DESTINATION } from "@/components/shared/navigation";
import { SectionSheet } from "@/components/shared/section-sheet";
import { NewAdmissionInterviewScreen } from "@/modules/admissions";

export const metadata: Metadata = {
  title: "Nueva entrevista",
  description:
    "Carga de una entrevista de admisión antes del ingreso de un huésped.",
  robots: { index: false, follow: false },
};

export default function NewAdmissionInterviewPage() {
  return (
    <SectionSheet destination={ADMISSIONS_DESTINATION} title="Nueva entrevista">
      <NewAdmissionInterviewScreen />
    </SectionSheet>
  );
}
