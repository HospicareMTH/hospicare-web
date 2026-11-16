import { ManualLayout } from "@/modules/help";

export default function DocumentationLayout({
  children,
}: LayoutProps<"/documentacion">) {
  return <ManualLayout>{children}</ManualLayout>;
}
