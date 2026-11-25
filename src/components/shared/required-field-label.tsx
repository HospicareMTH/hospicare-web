import type { ComponentProps } from "react";

import { FieldLabel } from "@/components/ui/field";

export function RequiredMark() {
  return (
    <span aria-hidden="true" className="text-destructive">
      *
    </span>
  );
}

export function RequiredFieldLabel({
  children,
  ...labelProps
}: ComponentProps<typeof FieldLabel>) {
  return (
    <FieldLabel {...labelProps}>
      {children}
      <RequiredMark />
    </FieldLabel>
  );
}
