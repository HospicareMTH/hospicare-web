import type { Metadata } from "next";

import { ActivityLogScreen } from "@/modules/activity-log";

export const metadata: Metadata = {
  title: "Registro de actividad",
  description: "Quién hizo cada cambio e ingreso en el sistema, y cuándo.",
  robots: { index: false, follow: false },
};

export default function ActivityLogPage({
  searchParams,
}: PageProps<"/admin/actividad">) {
  return <ActivityLogScreen searchParams={searchParams} />;
}
