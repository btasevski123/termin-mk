"use server";

import { redirect } from "next/navigation";
import { clearAdminSessionCookie, isAdminPasswordCorrect, setAdminSessionCookie } from "@/lib/admin";

export async function loginAdmin(formData: FormData) {
  const password = String(formData.get("password") ?? "");
  if (!isAdminPasswordCorrect(password)) {
    redirect("/admin/login?error=1");
  }

  const started = await setAdminSessionCookie();
  if (!started) {
    redirect("/admin/login?error=1");
  }

  redirect("/admin");
}

export async function logoutAdmin() {
  await clearAdminSessionCookie();
  redirect("/admin/login");
}
