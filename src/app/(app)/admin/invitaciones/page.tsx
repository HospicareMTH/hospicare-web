import type { Metadata } from "next";

import { InvitationsScreen } from "@/modules/access/components";

export const metadata: Metadata = {
  title: "Invitaciones",
  description: "Invitaciones enviadas para sumar personas al equipo.",
};

export default function InvitationsPage({
  searchParams,
}: PageProps<"/admin/invitaciones">) {
  return <InvitationsScreen searchParams={searchParams} />;
}
