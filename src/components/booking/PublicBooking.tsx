"use client";

import { useCallback, useState } from "react";
import Link from "next/link";
import { getSlotsForDate } from "@/actions/slots";
import { AdminIcon, iconButtonClass } from "@/components/icons";
import { EVENT_KIND_LABELS } from "@/lib/constants";
import { formatLongDate } from "@/lib/dates";
import type { HallEventPublic, HallPublic, TimeSlotView } from "@/types/booking";
import { BookingModal } from "./BookingModal";
import { CalendarGrid } from "./CalendarGrid";
import { TimeSlotButton } from "./TimeSlotButton";

type Props = {
  hall: HallPublic;
  initialDate: string;
  initialSlots: TimeSlotView[];
  initialEvents: HallEventPublic[];
  eventDates: string[];
};

export function PublicBooking({ hall, initialDate, initialSlots, initialEvents, eventDates }: Props) {
  const [date, setDate] = useState(initialDate);
  const [slots, setSlots] = useState(initialSlots);
  const [dayEvents, setDayEvents] = useState(initialEvents);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState<TimeSlotView | null>(null);
  const markedDates = new Set(eventDates);

  const refreshSlots = useCallback(
    async (nextDate: string) => {
      setLoading(true);
      const result = await getSlotsForDate(hall.id, nextDate);
      if (result.ok) {
        setSlots(result.data.slots);
        setDayEvents(result.data.events);
      }
      setLoading(false);
    },
    [hall.id],
  );

  async function onSelectDate(nextDate: string) {
    setDate(nextDate);
    setSelected(null);
    await refreshSlots(nextDate);
  }

  const availableCount = slots.filter((slot) => slot.status === "available").length;

  return (
    <div className="mx-auto flex w-full max-w-lg flex-1 flex-col px-4 pb-8">
      <header className="flex items-start justify-between pb-5 pt-[max(1.25rem,env(safe-area-inset-top))]">
        <div>
          <p className="text-xl font-extrabold uppercase tracking-[0.28em] text-lime">
            Termin
          </p>
          <h1 className="mt-1 text-2xl font-bold leading-tight">{hall.name}</h1>
          <p className="text-sm text-white/60">{hall.location}</p>
        </div>
        <Link href="/admin" aria-label="Админ" title="Админ" className={iconButtonClass}>
          <AdminIcon />
        </Link>
      </header>

      <CalendarGrid selectedDate={date} onSelectDate={onSelectDate} eventDates={markedDates} />

      <div className="mt-6 flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold capitalize">{formatLongDate(date)}</h2>
          <p className="text-sm text-white/55">
            {loading ? "Се вчитува…" : `${availableCount} слободни термини`}
          </p>
        </div>
        <div className="flex flex-wrap justify-end gap-x-3 gap-y-1 text-xs text-white/60">
          <span className="flex items-center gap-1.5">
            <i className="size-2.5 rounded-full bg-available" /> Слободно
          </span>
          <span className="flex items-center gap-1.5">
            <i className="size-2.5 rounded-full bg-booked" /> Зафатено
          </span>
          <span className="flex items-center gap-1.5">
            <i className="size-2.5 rounded-full bg-blocked" /> Настан
          </span>
        </div>
      </div>

      {dayEvents.length > 0 ? (
        <div className="mt-4 rounded-2xl border border-blocked/30 bg-blocked/10 px-4 py-3">
          <p className="text-sm font-medium text-blocked">Салата е зафатена</p>
          {dayEvents.map((event) => (
            <p key={event.id} className="mt-1 text-sm text-white/80">
              {EVENT_KIND_LABELS[event.kind]} — {event.title}
              {event.startTime && event.endTime ? ` · ${event.startTime}–${event.endTime}` : ""}
            </p>
          ))}
        </div>
      ) : null}

      <div className={`mt-4 grid gap-2 ${loading ? "opacity-50" : ""}`}>
        {slots.map((slot) => (
          <TimeSlotButton
            key={slot.startTime}
            slot={slot}
            selected={selected?.startTime === slot.startTime}
            onSelect={setSelected}
          />
        ))}
      </div>

      {selected ? (
        <BookingModal
          hallId={hall.id}
          date={date}
          slot={selected}
          onClose={() => setSelected(null)}
          onBooked={() => {
            void refreshSlots(date);
          }}
        />
      ) : null}
    </div>
  );
}
