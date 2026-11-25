import type { Metadata } from "next";

import { EditAdmissionInterviewScreen } from "@/modules/admissions";
import { AcceptedInterviewEditNotice } from "@/modules/guests";

export const metadata: Metadata = {
  title: "Editar entrevista",
  description: "Edición de los datos de una entrevista de admisión.",
  robots: { index: false, follow: false },
};

export default function EditAdmissionInterviewPage({
  params,
}: PageProps<"/admisiones/[id]/editar">) {
  return (
    <EditAdmissionInterviewScreen
      params={params}
      renderEditNotice={(interviewId) => (
        <AcceptedInterviewEditNotice interviewId={interviewId} />
      )}
    />
  );
}
