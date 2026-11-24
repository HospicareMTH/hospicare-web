import type { Metadata } from "next";

import { AdmissionInterviewScreen } from "@/modules/admissions";
import { InterviewAcceptance } from "@/modules/guests";

export const metadata: Metadata = {
  title: "Entrevista de admisión",
  description: "Datos registrados en una entrevista de admisión.",
  robots: { index: false, follow: false },
};

export default function AdmissionInterviewPage({
  params,
}: PageProps<"/admisiones/[id]">) {
  return (
    <AdmissionInterviewScreen
      params={params}
      renderAcceptance={(interview) => <InterviewAcceptance {...interview} />}
    />
  );
}
