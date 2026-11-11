import type { Metadata } from "next";

import { PasswordRecoveryScreen } from "@/modules/access/components";

export const metadata: Metadata = {
  title: "Recuperar contraseña",
  description: "Pedí un enlace para crear una contraseña nueva.",
};

export default function PasswordRecoveryPage() {
  return <PasswordRecoveryScreen />;
}
