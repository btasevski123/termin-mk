import { getHall, getSlotsForDate } from "@/actions/slots";
import { PublicBooking } from "@/components/booking/PublicBooking";
import { todayInTimeZone } from "@/lib/dates";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const hall = await getHall();
  const date = todayInTimeZone();

  if (!hall) {
    return (
      <main className="mx-auto flex min-h-dvh max-w-lg flex-col justify-center px-6 text-center">
        <h1 className="text-2xl font-bold">Салата сè уште не е поставена</h1>
        <p className="mt-2 text-white/60">Стартувајте го seed скриптата: npm run db:seed</p>
      </main>
    );
  }

  const slots = await getSlotsForDate(hall.id, date);

  return (
    <main className="min-h-dvh">
      <PublicBooking
        hall={hall}
        initialDate={date}
        initialSlots={slots.ok ? slots.data : []}
      />
    </main>
  );
}
