import type { Metadata } from "next";

import { AdminHome } from "@/modules/access/components";

export const metadata: Metadata = {
  title: "Administración",
  description: "Roles, usuarios e invitaciones del equipo.",
};

export default function AdministrationPage() {
  return <AdminHome />;
}
