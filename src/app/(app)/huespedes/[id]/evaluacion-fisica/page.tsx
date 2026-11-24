import type { Metadata } from "next";

import { PhysicalEvaluationScreen } from "@/modules/evaluations";

export const metadata: Metadata = {
  title: "Evaluación física de ingreso",
  description:
    "Escala de síntomas y evaluación de ingreso de enfermería de un huésped.",
  robots: { index: false, follow: false },
};

export default function PhysicalEvaluationPage({
  params,
}: PageProps<"/huespedes/[id]/evaluacion-fisica">) {
  return <PhysicalEvaluationScreen params={params} />;
}
