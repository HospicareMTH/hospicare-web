import type { Metadata } from "next";

import { ADMISSIONS_DESTINATION } from "@/components/shared/navigation";
import { SectionSheet } from "@/components/shared/section-sheet";
import { AdmissionInterviewsScreen } from "@/modules/admissions";

export const metadata: Metadata = {
  title: "Admisiones",
  description:
    "Entrevistas de admisión registradas antes del ingreso de cada huésped.",
  robots: { index: false, follow: false },
};

export default function AdmissionsPage({
  searchParams,
}: PageProps<"/admisiones">) {
  return (
    <SectionSheet destination={ADMISSIONS_DESTINATION}>
      <AdmissionInterviewsScreen searchParams={searchParams} />
    </SectionSheet>
  );
}
