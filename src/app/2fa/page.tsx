import type { Metadata } from "next";

import { TwoFactorScreen } from "@/modules/access/components";

export const metadata: Metadata = {
  title: "Verificación",
  description: "Confirmá tu ingreso con el segundo factor.",
};

export default function TwoFactorPage() {
  return <TwoFactorScreen />;
}
