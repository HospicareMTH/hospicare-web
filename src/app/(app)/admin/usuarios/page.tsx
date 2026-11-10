import type { Metadata } from "next";

import { UsersScreen } from "@/modules/access/components";

export const metadata: Metadata = {
  title: "Usuarios",
  description: "Personas con acceso al sistema y el estado de su acceso.",
};

export default function UsersPage({
  searchParams,
}: PageProps<"/admin/usuarios">) {
  return <UsersScreen searchParams={searchParams} />;
}
