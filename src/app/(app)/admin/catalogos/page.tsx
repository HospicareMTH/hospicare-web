import type { Metadata } from "next";

import { CatalogsScreen } from "@/modules/catalogs";

export const metadata: Metadata = {
  title: "Catálogos",
  description:
    "Opciones de los formularios de admisión y de huéspedes, y profesionales de salud.",
};

export default function CatalogsPage({
  searchParams,
}: PageProps<"/admin/catalogos">) {
  return <CatalogsScreen searchParams={searchParams} />;
}
