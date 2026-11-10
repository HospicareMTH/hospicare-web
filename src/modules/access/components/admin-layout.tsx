import { forbidden, redirect } from "next/navigation";
import { type ReactNode, Suspense } from "react";

import { ADMINISTRATION_DESTINATION } from "@/components/shared/navigation";
import { SectionSheet } from "@/components/shared/section-sheet";

import { getAllowedAdminSections } from "../admin-sections";
import { getCurrentUser } from "../authorization";
import { AdminSectionNav } from "./admin-section-nav";

async function AllowedAdminSectionNav() {
  const { access } = await getCurrentUser();
  return <AdminSectionNav sections={getAllowedAdminSections(access)} />;
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

async function RedirectToFirstAdminSection(): Promise<never> {
  const { access } = await getCurrentUser();
  const [firstSection] = getAllowedAdminSections(access);
  if (!firstSection) {
    forbidden();
  }
  redirect(firstSection.href);
}

export function AdminHome() {
  return (
    <Suspense fallback={null}>
      <RedirectToFirstAdminSection />
    </Suspense>
  );
}
