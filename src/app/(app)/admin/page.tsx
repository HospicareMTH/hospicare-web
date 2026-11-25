import type { Metadata } from "next";

import { AdminHome } from "@/modules/access";

export const metadata: Metadata = {
  title: "Administración",
  description:
    "Usuarios, roles, invitaciones, catálogos, configuración y registro de actividad del sistema.",
};

export default function AdministrationPage() {
  return <AdminHome />;
}
