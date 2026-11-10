import type { ComponentProps } from "react";

import { FieldLabel } from "@/components/ui/field";

export function RequiredFieldLabel({
  children,
  ...labelProps
}: ComponentProps<typeof FieldLabel>) {
  return (
    <FieldLabel {...labelProps}>
      {children}
      <span aria-hidden="true" className="text-destructive">
        *
      </span>
    </FieldLabel>
  );
}
