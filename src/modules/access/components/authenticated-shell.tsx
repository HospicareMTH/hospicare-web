import type { ReactNode } from "react";

import { AppShell } from "@/components/shared/app-shell";

import { requireSession } from "../session";
import { AccountMenu } from "./account-menu";

export async function AuthenticatedShell({
  children,
}: {
  children: ReactNode;
}) {
  const session = await requireSession();

  return (
    <AppShell accountMenu={<AccountMenu userName={session.user.name} />}>
      {children}
    </AppShell>
  );
}
