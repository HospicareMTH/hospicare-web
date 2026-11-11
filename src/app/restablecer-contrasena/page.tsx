import type { Metadata } from "next";

import { PasswordResetScreen } from "@/modules/access/components";

export const metadata: Metadata = {
  title: "Nueva contraseña",
  description: "Creá una contraseña nueva para entrar a Hospicare.",
};

export default function PasswordResetPage({
  searchParams,
}: PageProps<"/restablecer-contrasena">) {
  return <PasswordResetScreen searchParams={searchParams} />;
}
