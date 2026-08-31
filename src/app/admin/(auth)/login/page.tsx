import { redirect } from "next/navigation";
import { loginAdmin } from "@/actions/admin";
import { isAdmin } from "@/lib/admin";

export default async function AdminLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  if (await isAdmin()) {
    redirect("/admin");
  }

  const params = await searchParams;

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-sm flex-col justify-center px-4">
      <p className="text-sm font-medium uppercase tracking-[0.18em] text-lime">Termin</p>
      <h1 className="mt-2 text-2xl font-bold">Админ пристап</h1>
      <p className="mt-1 text-sm text-white/55">За сопственикот на салата.</p>

      <form action={loginAdmin} className="mt-8 space-y-3">
        <label className="block">
          <span className="mb-1.5 block text-sm text-white/70">Лозинка</span>
          <input
            name="password"
            type="password"
            required
            autoFocus
            className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 outline-none focus:border-lime"
          />
        </label>
        {params.error ? <p className="text-sm text-booked">Погрешна лозинка.</p> : null}
        <button type="submit" className="w-full rounded-2xl bg-lime py-3.5 font-semibold text-pitch">
          Најава
        </button>
      </form>
    </main>
  );
}
