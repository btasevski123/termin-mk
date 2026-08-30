"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { logoutAdmin } from "@/actions/admin";
import { CalendarIcon, LogOutIcon, iconButtonClass } from "@/components/icons";
import { addDaysISO, formatDayLabel, startOfWeekMonday, todayInTimeZone, weekDates } from "@/lib/dates";
import { eventBlocksSlot, eventCoversDate, generateTimeSlots } from "@/lib/slots";
import type { BookingWithCustomer, HallEventPublic, HallPublic } from "@/types/booking";
import { BookingsTable } from "./BookingsTable";
import { HallEventsPanel } from "./HallEventsPanel";
import { ManualBookingForm } from "./ManualBookingForm";

type View = "day" | "week";

type Props = {
  hall: HallPublic;
  initialDate: string;
  bookings: BookingWithCustomer[];
  events: HallEventPublic[];
  upcomingEvents: HallEventPublic[];
};

function bookingDateISO(booking: BookingWithCustomer): string {
  return new Date(booking.date).toISOString().slice(0, 10);
}

export function AdminDashboard({ hall, initialDate, bookings, events, upcomingEvents }: Props) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [view, setView] = useState<View>("day");
  const date = initialDate;
  const [prefillsStart, setPrefillStart] = useState<string | undefined>();

  function goTo(nextDate: string) {
    router.push(`/admin?date=${nextDate}`);
  }

  const slots = generateTimeSlots(hall.slotStartHour, hall.slotEndHour, hall.slotDurationMinutes);
  const days = weekDates(date);

  const visibleBookings = useMemo(() => {
    if (view === "day") {
      return bookings.filter((booking) => bookingDateISO(booking) === date);
    }
    const week = new Set(days);
    return bookings.filter((booking) => week.has(bookingDateISO(booking)));
  }, [bookings, date, days, view]);

  function refresh() {
    startTransition(() => router.refresh());
  }

  function shift(daysBy: number) {
    goTo(addDaysISO(date, daysBy));
  }

  return (
    <div className="mx-auto w-full max-w-3xl px-4 pb-10 pt-[max(1.25rem,env(safe-area-inset-top))]">
      <header className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-medium uppercase tracking-[0.18em] text-lime">Админ</p>
          <h1 className="text-2xl font-bold">{hall.name}</h1>
          <p className="text-sm text-white/55">{hall.location}</p>
        </div>
        <div className="flex gap-2">
          <Link href="/" aria-label="Календар" title="Календар" className={iconButtonClass}>
            <CalendarIcon />
          </Link>
          <form action={logoutAdmin}>
            <button type="submit" aria-label="Одјава" title="Одјава" className={iconButtonClass}>
              <LogOutIcon />
            </button>
          </form>
        </div>
      </header>

      <div className="mt-5 flex rounded-2xl bg-white/5 p-1">
        {(["day", "week"] as const).map((option) => (
          <button
            key={option}
            type="button"
            onClick={() => setView(option)}
            className={`flex-1 rounded-xl py-2 text-sm font-medium ${
              view === option ? "bg-lime text-pitch" : "text-white/70"
            }`}
          >
            {option === "day" ? "Ден" : "Недела"}
          </button>
        ))}
      </div>

      <div className="mt-4 flex items-center justify-between">
        <button type="button" onClick={() => shift(view === "week" ? -7 : -1)} className="rounded-xl px-3 py-2 text-sm text-white/70">
          ←
        </button>
        <div className="text-center">
          <p className="font-semibold capitalize">
            {view === "day"
              ? formatDayLabel(date).day + " " + formatDayLabel(date).month
              : `${formatDayLabel(days[0]).day}–${formatDayLabel(days[6]).day} ${formatDayLabel(days[6]).month}`}
          </p>
          <button
            type="button"
            onClick={() => goTo(todayInTimeZone())}
            className="text-xs text-lime"
          >
            Денес
          </button>
        </div>
        <button type="button" onClick={() => shift(view === "week" ? 7 : 1)} className="rounded-xl px-3 py-2 text-sm text-white/70">
          →
        </button>
      </div>

      {view === "week" ? (
        <div className="mt-4 overflow-x-auto rounded-2xl border border-white/10">
          <table className="w-full min-w-[640px] text-left text-xs">
            <thead className="bg-white/5 text-white/60">
              <tr>
                <th className="px-2 py-2 font-medium">Час</th>
                {days.map((iso) => {
                  const label = formatDayLabel(iso);
                  const isSelected = iso === date;
                  return (
                    <th key={iso} className="px-1 py-2 text-center font-medium">
                      <button
                        type="button"
                        onClick={() => goTo(iso)}
                        className={`rounded-lg px-2 py-1 ${isSelected ? "bg-lime text-pitch" : ""}`}
                      >
                        {label.weekday}
                        <span className="block">{label.day}</span>
                      </button>
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              {slots.map((slot) => (
                <tr key={slot.startTime} className="border-t border-white/5">
                  <td className="whitespace-nowrap px-2 py-2 text-white/60">{slot.startTime}</td>
                  {days.map((iso) => {
                    const activeBooking = bookings.find(
                      (item) =>
                        bookingDateISO(item) === iso &&
                        item.startTime === slot.startTime &&
                        item.status !== "CANCELLED",
                    );
                    const cancelledBooking = bookings.find(
                      (item) =>
                        bookingDateISO(item) === iso &&
                        item.startTime === slot.startTime &&
                        item.status === "CANCELLED",
                    );
                    const event = events.find(
                      (item) => eventCoversDate(item, iso) && eventBlocksSlot(item, slot),
                    );
                    return (
                      <td key={`${iso}-${slot.startTime}`} className="px-1 py-1">
                        {activeBooking ? (
                          <div className="rounded-lg bg-booked/20 px-1.5 py-1 text-booked">
                            <p className="truncate font-medium">{activeBooking.customer.name}</p>
                            <p className="truncate opacity-80">
                              {activeBooking.source === "PHONE" ? "тел." : "онлајн"}
                            </p>
                          </div>
                        ) : event ? (
                          <div className="rounded-lg bg-blocked/20 px-1.5 py-1 text-blocked" title={event.title}>
                            <p className="truncate font-medium">{event.title}</p>
                            <p className="truncate opacity-80">
                              {cancelledBooking ? `откажано: ${cancelledBooking.customer.name}` : "настан"}
                            </p>
                          </div>
                        ) : cancelledBooking ? (
                          <div className="rounded-lg bg-white/5 px-1.5 py-1 text-white/45">
                            <p className="truncate font-medium line-through">{cancelledBooking.customer.name}</p>
                            <p className="truncate opacity-80">откажано</p>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => {
                              setPrefillStart(slot.startTime);
                              setView("day");
                              goTo(iso);
                            }}
                            className="h-full min-h-10 w-full rounded-lg bg-available/10 text-available hover:bg-available/20"
                          >
                            +
                          </button>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}

      <section className="mt-6 space-y-3">
        <h2 className="font-semibold">
          {view === "day" ? "Резервации за денот" : "Резервации за неделата"}
        </h2>
        <BookingsTable bookings={visibleBookings} onChanged={refresh} />
      </section>

      <section className="mt-6">
        <ManualBookingForm
          key={`${date}-${prefillsStart ?? "none"}-${startOfWeekMonday(date)}`}
          hall={hall}
          date={date}
          startTime={prefillsStart}
          events={events}
          onCreated={refresh}
        />
      </section>

      <section className="mt-8">
        <HallEventsPanel hall={hall} date={date} events={upcomingEvents} onChanged={refresh} />
      </section>
    </div>
  );
}
