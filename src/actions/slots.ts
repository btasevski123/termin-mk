"use server";

import { HALL_SLUG } from "@/lib/constants";
import { dateFromISO } from "@/lib/dates";
import { toHallEventPublic } from "@/lib/events";
import { prisma } from "@/lib/prisma";
import { buildSlotViews } from "@/lib/slots";
import type { ActionResult, HallEventPublic, HallPublic, TimeSlotView } from "@/types/booking";

const hallSelect = {
  id: true,
  name: true,
  location: true,
  slug: true,
  timezone: true,
  slotStartHour: true,
  slotEndHour: true,
  slotDurationMinutes: true,
} as const;

export async function getHall(slug = HALL_SLUG): Promise<HallPublic | null> {
  return prisma.hall.findUnique({
    where: { slug },
    select: hallSelect,
  });
}

export async function getSlotsForDate(
  hallId: string,
  dateISO: string,
): Promise<ActionResult<{ slots: TimeSlotView[]; events: HallEventPublic[] }>> {
  const date = dateFromISO(dateISO);
  const hall = await prisma.hall.findUnique({ where: { id: hallId } });
  if (!hall) {
    return { ok: false, error: "Салата не е пронајдена." };
  }

  const [bookings, events] = await Promise.all([
    prisma.booking.findMany({
      where: {
        hallId,
        date,
        status: { in: ["PENDING", "CONFIRMED"] },
      },
      select: { startTime: true },
    }),
    prisma.hallEvent.findMany({
      where: {
        hallId,
        startDate: { lte: date },
        endDate: { gte: date },
      },
      orderBy: [{ startTime: "asc" }],
    }),
  ]);

  const booked = new Set(bookings.map((booking) => booking.startTime));
  const publicEvents = events.map(toHallEventPublic);
  const slots = buildSlotViews(
    dateISO,
    {
      startHour: hall.slotStartHour,
      endHour: hall.slotEndHour,
      durationMinutes: hall.slotDurationMinutes,
    },
    booked,
    publicEvents,
  );

  return { ok: true, data: { slots, events: publicEvents } };
}
