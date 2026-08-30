"use server";

import { HALL_SLUG } from "@/lib/constants";
import { dateFromISO } from "@/lib/dates";
import { prisma } from "@/lib/prisma";
import { buildSlotViews } from "@/lib/slots";
import type { ActionResult, HallPublic, TimeSlotView } from "@/types/booking";

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
): Promise<ActionResult<TimeSlotView[]>> {
  const hall = await prisma.hall.findUnique({ where: { id: hallId } });
  if (!hall) {
    return { ok: false, error: "Салата не е пронајдена." };
  }

  const bookings = await prisma.booking.findMany({
    where: {
      hallId,
      date: dateFromISO(dateISO),
      status: { in: ["PENDING", "CONFIRMED"] },
    },
    select: { startTime: true },
  });

  const booked = new Set(bookings.map((booking) => booking.startTime));
  const slots = buildSlotViews(
    dateISO,
    {
      startHour: hall.slotStartHour,
      endHour: hall.slotEndHour,
      durationMinutes: hall.slotDurationMinutes,
    },
    booked,
  );

  return { ok: true, data: slots };
}
