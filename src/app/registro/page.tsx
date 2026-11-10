import type { Metadata } from "next";

import { SignUpScreen } from "@/modules/access/components";

export const metadata: Metadata = {
  title: "Registro",
  description: "El alta en Hospicare es solo por invitación.",
};

export default function SignUpPage() {
  return <SignUpScreen />;
}
