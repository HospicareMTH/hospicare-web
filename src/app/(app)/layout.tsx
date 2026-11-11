import { Suspense } from "react";

import {
  AuthenticatedShell,
  SessionLoadingScreen,
} from "@/modules/access/components";

export default function AuthenticatedLayout({ children }: LayoutProps<"/">) {
  return (
    <Suspense fallback={<SessionLoadingScreen />}>
      <AuthenticatedShell>{children}</AuthenticatedShell>
    </Suspense>
  );
}
