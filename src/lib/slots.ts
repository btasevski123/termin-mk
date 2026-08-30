import { isSlotInPast } from "./dates";
import type { TimeSlotView } from "@/types/booking";

export function formatClock(totalMinutes: number): string {
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
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
): TimeSlotView[] {
  return generateTimeSlots(hours.startHour, hours.endHour, hours.durationMinutes).map((slot) => {
    const booked = bookedStartTimes.has(slot.startTime);
    const past = isSlotInPast(dateISO, slot.startTime);

    return {
      ...slot,
      status: booked ? "booked" : past ? "past" : "available",
    };
  });
}
