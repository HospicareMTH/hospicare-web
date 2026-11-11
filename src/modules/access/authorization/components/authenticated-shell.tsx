import { cookies } from "next/headers";
import type { ReactNode } from "react";

import { AppShell } from "@/components/shared/app-shell";
import { NAVIGATION_DESTINATIONS } from "@/components/shared/navigation";

import { filterAllowedDestinations, getCurrentUser } from "../service";
import { AccountMenu } from "./account-menu";

const SIDEBAR_STATE_COOKIE_NAME = "sidebar_state";
const SIDEBAR_COLLAPSED_VALUE = "false";

export async function AuthenticatedShell({
  children,
}: {
  children: ReactNode;
}) {
  const { name, access } = await getCurrentUser();
  const cookieStore = await cookies();
  const isSidebarOpenByDefault =
    cookieStore.get(SIDEBAR_STATE_COOKIE_NAME)?.value !==
    SIDEBAR_COLLAPSED_VALUE;

  return (
    <AppShell
      destinations={filterAllowedDestinations(access, NAVIGATION_DESTINATIONS)}
      accountMenu={<AccountMenu userName={name} />}
      isSidebarOpenByDefault={isSidebarOpenByDefault}
    >
      {children}
    </AppShell>
  );
}
