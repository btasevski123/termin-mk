"use client";

import { DAYS_AHEAD } from "@/lib/constants";
import { formatDayLabel, todayInTimeZone, upcomingDays } from "@/lib/dates";

type Props = {
  selectedDate: string;
  onSelectDate: (date: string) => void;
};

export function CalendarGrid({ selectedDate, onSelectDate }: Props) {
  const today = todayInTimeZone();
  const days = upcomingDays(DAYS_AHEAD, today);

  return (
    <div className="-mx-4 overflow-x-auto px-4 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      <div className="flex snap-x snap-mandatory gap-2">
        {days.map((iso) => {
          const { weekday, day } = formatDayLabel(iso);
          const active = iso === selectedDate;
          const isToday = iso === today;

          return (
            <button
              key={iso}
              type="button"
              onClick={() => onSelectDate(iso)}
              className={`snap-start flex w-16 shrink-0 flex-col items-center rounded-2xl border px-2 py-3 transition ${
                active
                  ? "border-lime bg-lime/10 text-lime shadow-[0_0_14px_rgba(198,240,77,0.35)]"
                  : "border-white/10 bg-white/5 text-white hover:border-white/25"
              }`}
            >
              <span className={`text-xs font-medium uppercase ${active ? "text-lime/80" : "text-white/55"}`}>
                {isToday ? "денес" : weekday}
              </span>
              <span className="mt-1 text-xl font-bold leading-none">{day}</span>
              <span
                className={`mt-1.5 size-1.5 rounded-full ${
                  isToday ? "bg-lime shadow-[0_0_6px_rgba(198,240,77,0.9)]" : "bg-transparent"
                }`}
                aria-hidden={!isToday}
              />
            </button>
          );
        })}
      </div>
    </div>
  );
}
