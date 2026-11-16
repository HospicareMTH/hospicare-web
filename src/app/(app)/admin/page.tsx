import type { Metadata } from "next";

import { AdminHome } from "@/modules/access";

export const metadata: Metadata = {
  title: "Administración",
  description: "Usuarios, roles, invitaciones y catálogos del sistema.",
};

export default function AdministrationPage() {
  return <AdminHome />;
}
