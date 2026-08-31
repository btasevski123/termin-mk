import { isSlotInPast } from "./dates";
import type { TimeSlotView } from "@/types/booking";

/** Unique occupancy token for an active (PENDING/CONFIRMED) hall slot. */
export function activeBookingSlotKey(hallId: string, dateISO: string, startTime: string): string {
  return `${hallId}:${dateISO}:${startTime}`;
}

export function formatClock(totalMinutes: number): string {
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
}

export function clockToMinutes(clock: string): number {
  const [hours, minutes] = clock.split(":").map(Number);
  return hours * 60 + (minutes || 0);
}

export function rangesOverlap(aStart: number, aEnd: number, bStart: number, bEnd: number): boolean {
  return aStart < bEnd && aEnd > bStart;
}

type TimeWindow = { startTime: string | null; endTime: string | null };

export function eventBlocksSlot(event: TimeWindow, slot: { startTime: string; endTime: string }): boolean {
  if (!event.startTime || !event.endTime) return true;
  return rangesOverlap(
    clockToMinutes(slot.startTime),
    clockToMinutes(slot.endTime),
    clockToMinutes(event.startTime),
    clockToMinutes(event.endTime),
  );
}

export function eventCoversDate(
  event: { startDate: string; endDate: string },
  dateISO: string,
): boolean {
  return event.startDate <= dateISO && dateISO <= event.endDate;
}

export function generateTimeSlots(
  startHour: number,
  endHour: number,
  durationMinutes: number,
): { startTime: string; endTime: string }[] {
  const slots: { startTime: string; endTime: string }[] = [];
  const closeAt = endHour * 60;

  for (let start = startHour * 60; start + durationMinutes <= closeAt; start += durationMinutes) {
    slots.push({
      startTime: formatClock(start),
      endTime: formatClock(start + durationMinutes),
    });
  }

  return slots;
}

export function buildSlotViews(
  dateISO: string,
  hours: { startHour: number; endHour: number; durationMinutes: number },
  bookedStartTimes: Set<string>,
  blockingEvents: { title: string; startTime: string | null; endTime: string | null }[] = [],
): TimeSlotView[] {
  return generateTimeSlots(hours.startHour, hours.endHour, hours.durationMinutes).map((slot) => {
    const booked = bookedStartTimes.has(slot.startTime);
    const past = isSlotInPast(dateISO, slot.startTime);
    const event = blockingEvents.find((item) => eventBlocksSlot(item, slot));

    if (booked) return { ...slot, status: "booked" as const };
    if (event) return { ...slot, status: "blocked" as const, label: event.title };
    if (past) return { ...slot, status: "past" as const };
    return { ...slot, status: "available" as const };
  });
}
