import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { ADMIN_COOKIE, isValidAdminToken } from "@/lib/admin";

export default async function AdminDashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const cookieStore = await cookies();
  if (!isValidAdminToken(cookieStore.get(ADMIN_COOKIE)?.value)) {
    redirect("/admin/login");
  }

  return children;
}
