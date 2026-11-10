import type { Metadata } from "next";

import { AcceptInvitationScreen } from "@/modules/access/components";

export const metadata: Metadata = {
  title: "Aceptar invitación",
  description: "Creá tu contraseña para entrar a Hospicare.",
};

export default function AcceptInvitationPage({
  searchParams,
}: PageProps<"/invitaciones/aceptar">) {
  return <AcceptInvitationScreen searchParams={searchParams} />;
}
