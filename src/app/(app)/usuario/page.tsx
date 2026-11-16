import type { Metadata } from "next";

import { AccountScreen } from "@/modules/access";

export const metadata: Metadata = {
  title: "Mi cuenta",
  description:
    "Tu nombre, tu correo, tu contraseña y la seguridad de tu cuenta.",
};

export default function AccountPage() {
  return <AccountScreen />;
}
