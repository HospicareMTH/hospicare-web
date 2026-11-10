import type { Metadata } from "next";

import { AccountScreen } from "@/modules/access/components";

export const metadata: Metadata = {
  title: "Mi cuenta",
  description: "Verificación del correo y segundo factor de tu cuenta.",
};

export default function AccountPage() {
  return <AccountScreen />;
}
