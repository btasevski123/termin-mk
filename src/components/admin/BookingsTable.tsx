"use client";

import { useState } from "react";
import { cancelBooking } from "@/actions/bookings";
import { formatLongDate, toISODate } from "@/lib/dates";
import { displayMkPhone } from "@/lib/phone";
import type { BookingWithCustomer } from "@/types/booking";

type Props = {
  bookings: BookingWithCustomer[];
  onChanged: () => void;
};

export function BookingsTable({ bookings, onChanged }: Props) {
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function onCancel(id: string) {
    if (!window.confirm("Да се откаже оваа резервација?")) return;
    setBusyId(id);
    setError(null);
    const result = await cancelBooking(id);
    setBusyId(null);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    onChanged();
  }

  if (bookings.length === 0) {
    return (
      <p className="rounded-2xl border border-dashed border-white/15 px-4 py-8 text-center text-sm text-white/50">
        Нема активни резервации за овој период.
      </p>
    );
  }

  return (
    <div className="space-y-2">
      {error ? <p className="text-sm text-booked">{error}</p> : null}
      {bookings.map((booking) => {
        const dateISO = toISODate(new Date(booking.date));
        return (
          <article
            key={booking.id}
            className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-semibold">
                  {booking.startTime}–{booking.endTime}
                </p>
                <p className="text-sm capitalize text-white/60">{formatLongDate(dateISO)}</p>
                <p className="mt-1 text-sm">
                  {booking.customer.name} · {displayMkPhone(booking.customer.phone)}
                </p>
                <p className="mt-1 text-xs text-white/45">
                  {booking.source === "PHONE" ? "Телефон" : "Онлајн"}
                  {booking.notes ? ` · ${booking.notes}` : ""}
                </p>
              </div>
              <button
                type="button"
                disabled={busyId === booking.id}
                onClick={() => onCancel(booking.id)}
                className="rounded-xl border border-booked/40 px-3 py-1.5 text-xs font-medium text-booked disabled:opacity-50"
              >
                {busyId === booking.id ? "…" : "Откажи"}
              </button>
            </div>
          </article>
        );
      })}
    </div>
  );
}
