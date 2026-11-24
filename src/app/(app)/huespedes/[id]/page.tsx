import type { Metadata } from "next";

import { GuestScreen } from "@/modules/guests";

export const metadata: Metadata = {
  title: "Huésped",
  description: "Ficha de un huésped con sus datos de internación.",
  robots: { index: false, follow: false },
};

export default function GuestPage({ params }: PageProps<"/huespedes/[id]">) {
  return <GuestScreen params={params} />;
}
