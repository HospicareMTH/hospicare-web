import { forbidden } from "next/navigation";
import { type ReactNode, Suspense } from "react";

import { ADMINISTRATION_DESTINATION } from "@/components/shared/navigation";
import { SectionSheet } from "@/components/shared/section-sheet";

import { ADMIN_SUMMARY_LINK, getAllowedAdminSections } from "../sections";
import { getCurrentUser } from "../../authorization/service";
import { getAdminSummary } from "../service";
import { AdminSectionNav } from "./admin-section-nav";

import { LoadingStatus } from "@/components/shared/loading-status";

async function AllowedAdminSectionNav() {
  const { access } = await getCurrentUser();
  const sections = getAllowedAdminSections(access);
  return (
    <AdminSectionNav
      sections={sections.length > 0 ? [ADMIN_SUMMARY_LINK, ...sections] : []}
    />
  );
}

export function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <SectionSheet destination={ADMINISTRATION_DESTINATION}>
      <Suspense fallback={null}>
        <AllowedAdminSectionNav />
      </Suspense>
      {children}
    </SectionSheet>
  );
}

async function AdminSummaryContent() {
  const { access } = await getCurrentUser();
  if (getAllowedAdminSections(access).length === 0) {
    forbidden();
  }
  const summary = await getAdminSummary(access);
  const totals = [
    { label: "Roles", value: summary.roleCount },
    { label: "Usuarios", value: summary.userCount },
    { label: "Usuarios activos", value: summary.activeUserCount },
    { label: "Invitaciones pendientes", value: summary.pendingInvitationCount },
  ].filter((total) => total.value !== null);

  return (
    <dl className="grid grid-cols-2 overflow-hidden rounded-xl border bg-card lg:grid-cols-4">
      {totals.map((total) => (
        <div
          key={total.label}
          className="-mr-px -mb-px flex flex-col gap-1 border-r border-b p-4"
        >
          <dt className="text-base text-muted-foreground">{total.label}</dt>
          <dd className="text-3xl font-semibold tabular-nums">{total.value}</dd>
        </div>
      ))}
    </dl>
  );
}

export function AdminHome() {
  return (
    <Suspense fallback={<LoadingStatus label="Cargando el resumen…" />}>
      <AdminSummaryContent />
    </Suspense>
  );
}
