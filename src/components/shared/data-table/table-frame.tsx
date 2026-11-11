import type { ReactNode } from "react";

export function TableFrame({ children }: { children: ReactNode }) {
  return (
    <div className="@container overflow-hidden rounded-xl border">
      {children}
    </div>
  );
}
