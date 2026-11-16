import { AdminLayout } from "@/modules/access";

export default function AdministrationLayout({
  children,
}: LayoutProps<"/admin">) {
  return <AdminLayout>{children}</AdminLayout>;
}
