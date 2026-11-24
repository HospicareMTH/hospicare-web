import type { Metadata } from "next";

import { GuestDailyEvolutions } from "@/modules/daily-evolutions";
import { GuestEvaluations } from "@/modules/evaluations";
import { GuestScreen } from "@/modules/guests";

export const metadata: Metadata = {
  title: "Huésped",
  description:
    "Ficha de un huésped con su internación, evolución diaria y evaluaciones.",
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
      renderDailyEvolutions={(guest) => <GuestDailyEvolutions guest={guest} />}
      renderEvaluations={(guest) => <GuestEvaluations guest={guest} />}
    />
  );
}
