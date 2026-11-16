import type { Metadata } from "next";

import { HOME_DESTINATION } from "@/components/shared/navigation";
import { SectionSheet } from "@/components/shared/section-sheet";
import { EmailVerificationNotice } from "@/modules/access/components";
import { DashboardReports } from "@/modules/dashboard/components";

export const metadata: Metadata = {
  title: "Inicio",
  description: "Reportes operativos del Hospice Madre Teresa.",
};

export default function HomePage() {
  return (
    <SectionSheet destination={HOME_DESTINATION}>
      <EmailVerificationNotice />
      <DashboardReports />
    </SectionSheet>
  );
}
