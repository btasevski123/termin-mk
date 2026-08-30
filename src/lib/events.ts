import type { HallEvent } from "@prisma/client";
import { EVENT_KIND_LABELS } from "./constants";
import { eachDateISO, formatLongDate, toISODate } from "./dates";
import type { EventKind, HallEventPublic } from "@/types/booking";

export function toHallEventPublic(event: HallEvent): HallEventPublic {
  return {
    id: event.id,
    hallId: event.hallId,
    title: event.title,
    kind: event.kind,
    startDate: toISODate(event.startDate),
    endDate: toISODate(event.endDate),
    startTime: event.startTime,
    endTime: event.endTime,
    notes: event.notes,
  };
}

export function kindLabel(kind: EventKind): string {
  return EVENT_KIND_LABELS[kind];
}

export function formatEventWhen(event: HallEventPublic): string {
  const hours =
    event.startTime && event.endTime ? `${event.startTime}–${event.endTime}` : "цел ден";

  if (event.startDate === event.endDate) {
    return `${formatLongDate(event.startDate)} · ${hours}`;
  }

  return `${formatLongDate(event.startDate)} – ${formatLongDate(event.endDate)} · ${hours}`;
}

export function expandEventDates(events: HallEventPublic[]): Set<string> {
  const dates = new Set<string>();
  for (const event of events) {
    for (const iso of eachDateISO(event.startDate, event.endDate)) {
      dates.add(iso);
    }
  }
  return dates;
}
