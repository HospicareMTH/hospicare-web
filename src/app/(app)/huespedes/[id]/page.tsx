import type { Metadata } from "next";

import { GuestEvaluations } from "@/modules/evaluations";
import { GuestScreen } from "@/modules/guests";

export const metadata: Metadata = {
  title: "Huésped",
  description:
    "Ficha de un huésped con sus datos de internación y sus evaluaciones.",
  robots: { index: false, follow: false },
};

export default function GuestPage({
  params,
  searchParams,
}: PageProps<"/huespedes/[id]">) {
  return (
    <GuestScreen
      params={params}
      searchParams={searchParams}
      renderEvaluations={(guest) => <GuestEvaluations guest={guest} />}
    />
  );
}
