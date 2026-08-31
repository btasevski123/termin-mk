import { redirect } from "next/navigation";
import { isAdmin } from "@/lib/admin";

export default async function AdminDashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  if (!(await isAdmin())) {
    redirect("/admin/login");
  }

  return children;
}
