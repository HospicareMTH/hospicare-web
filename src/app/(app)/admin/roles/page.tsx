import type { Metadata } from "next";

import { RolesScreen } from "@/modules/access/components";

export const metadata: Metadata = {
  title: "Roles",
  description: "Roles del equipo y los permisos de cada uno.",
};

export default function RolesPage({ searchParams }: PageProps<"/admin/roles">) {
  return <RolesScreen searchParams={searchParams} />;
}
