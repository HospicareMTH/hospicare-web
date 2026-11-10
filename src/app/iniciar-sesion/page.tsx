import type { Metadata } from "next";

import { SignInScreen } from "@/modules/access/components";

export const metadata: Metadata = {
  title: "Iniciar sesión",
  description:
    "Ingresá a la historia clínica digital del Hospice Madre Teresa.",
  robots: { index: true, follow: false },
};

export default function SignInPage() {
  return <SignInScreen />;
}
