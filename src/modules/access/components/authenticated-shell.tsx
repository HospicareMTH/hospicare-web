import { cookies } from "next/headers";
import type { ReactNode } from "react";

import { AppShell } from "@/components/shared/app-shell";

import { requireSession } from "../session";
import { AccountMenu } from "./account-menu";

const SIDEBAR_STATE_COOKIE_NAME = "sidebar_state";
const SIDEBAR_COLLAPSED_VALUE = "false";

export async function AuthenticatedShell({
  children,
}: {
  children: ReactNode;
}) {
  const session = await requireSession();
  const cookieStore = await cookies();
  const isSidebarOpenByDefault =
    cookieStore.get(SIDEBAR_STATE_COOKIE_NAME)?.value !==
    SIDEBAR_COLLAPSED_VALUE;

  return (
    <AppShell
      accountMenu={<AccountMenu userName={session.user.name} />}
      isSidebarOpenByDefault={isSidebarOpenByDefault}
    >
      {children}
    </AppShell>
  );
}
