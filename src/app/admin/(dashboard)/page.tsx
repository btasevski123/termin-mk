import { getWeekBookings } from "@/actions/bookings";
import { getHall } from "@/actions/slots";
import { AdminDashboard } from "@/components/admin/AdminDashboard";
import { todayInTimeZone } from "@/lib/dates";

export const dynamic = "force-dynamic";

export default async function AdminPage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string }>;
}) {
  const hall = await getHall();
  const params = await searchParams;
  const date = params.date && /^\d{4}-\d{2}-\d{2}$/.test(params.date) ? params.date : todayInTimeZone();

  if (!hall) {
    return (
      <main className="mx-auto flex min-h-dvh max-w-lg flex-col justify-center px-6 text-center">
        <h1 className="text-2xl font-bold">Салата сè уште не е поставена</h1>
        <p className="mt-2 text-white/60">Стартувајте го seed скриптата: npm run db:seed</p>
      </main>
    );
  }

  const { bookings } = await getWeekBookings(hall.id, date);

  return (
    <main className="min-h-dvh">
      <AdminDashboard hall={hall} initialDate={date} bookings={bookings} />
    </main>
  );
}
