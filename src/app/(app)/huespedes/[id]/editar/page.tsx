import type { Metadata } from "next";

import { EditGuestScreen } from "@/modules/guests";

export const metadata: Metadata = {
  title: "Editar huésped",
  description: "Corrección de los datos de internación de un huésped.",
  robots: { index: false, follow: false },
};

export default function EditGuestPage({
  params,
}: PageProps<"/huespedes/[id]/editar">) {
  return <EditGuestScreen params={params} />;
}
