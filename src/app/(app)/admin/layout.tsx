import { AdminLayout } from "@/modules/access/components";

export default function AdministrationLayout({
  children,
}: LayoutProps<"/admin">) {
  return <AdminLayout>{children}</AdminLayout>;
}
