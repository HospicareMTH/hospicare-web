import { Suspense } from "react";

import { AuthenticatedShell, SessionLoadingScreen } from "@/modules/access";
import { GlobalSearch } from "@/modules/help";

export default function AuthenticatedLayout({ children }: LayoutProps<"/">) {
  return (
    <Suspense fallback={<SessionLoadingScreen />}>
      <AuthenticatedShell search={<GlobalSearch />}>
        {children}
      </AuthenticatedShell>
    </Suspense>
  );
}
