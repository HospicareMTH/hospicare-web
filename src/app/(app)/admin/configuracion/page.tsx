import type { Metadata } from "next";

import { SystemSettingsScreen } from "@/modules/settings";

export const metadata: Metadata = {
  title: "Configuración",
  description:
    "Parámetros del sistema, como el último número de historia clínica asignado.",
  robots: { index: false, follow: false },
};

export default function SystemSettingsPage() {
  return <SystemSettingsScreen />;
}
