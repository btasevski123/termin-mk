"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { ADMIN_COOKIE, isValidAdminToken } from "@/lib/admin";
import { dateFromISO, eachDateISO, todayInTimeZone, toISODate } from "@/lib/dates";
import { toHallEventPublic } from "@/lib/events";
import { prisma } from "@/lib/prisma";
import { clockToMinutes, eventBlocksSlot, generateTimeSlots } from "@/lib/slots";
import type {
  ActionResult,
  BookingConflict,
  CreateHallEventInput,
  CreateHallEventResult,
  EventKind,
  HallEventPublic,
} from "@/types/booking";

const KINDS: EventKind[] = ["HANDBALL", "THEATER", "TOURNAMENT", "OTHER"];
const MAX_EVENT_DAYS = 30;
const TIME_RE = /^\d{2}:\d{2}$/;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function revalidateEventViews() {
  revalidatePath("/");
  revalidatePath("/admin");
}

async function isAdmin(): Promise<boolean> {
  const cookieStore = await cookies();
  return isValidAdminToken(cookieStore.get(ADMIN_COOKIE)?.value);
}

class EventBookingConflictError extends Error {
  constructor(readonly conflicts: BookingConflict[]) {
    super("HAS_CONFLICTS");
    this.name = "EventBookingConflictError";
  }
}

function toConflicts(
  bookings: Array<{
    id: string;
    date: Date;
    startTime: string;
    endTime: string;
    source: BookingConflict["source"];
    customer: { name: string; phone: string };
  }>,
): BookingConflict[] {
  return bookings.map((booking) => ({
    id: booking.id,
    date: toISODate(booking.date),
    startTime: booking.startTime,
    endTime: booking.endTime,
    name: booking.customer.name,
    phone: booking.customer.phone,
    source: booking.source,
  }));
}

function conflictResult(conflicts: BookingConflict[]): ActionResult<CreateHallEventResult> {
  const count = conflicts.length;
  const noun = count === 1 ? "резервација" : "резервации";
  return {
    ok: false,
    error: `Има ${count} ${noun} во овој период. Ќе се откажат кога ќе се блокира салата.`,
    conflicts,
  };
}

export async function getHallEventsForRange(
  hallId: string,
  fromISO: string,
  toISO: string,
): Promise<HallEventPublic[]> {
  const events = await prisma.hallEvent.findMany({
    where: {
      hallId,
      startDate: { lte: dateFromISO(toISO) },
      endDate: { gte: dateFromISO(fromISO) },
    },
    orderBy: [{ startDate: "asc" }, { startTime: "asc" }],
  });
  return events.map(toHallEventPublic);
}

export async function getUpcomingHallEvents(hallId: string): Promise<HallEventPublic[]> {
  const today = todayInTimeZone();
  const events = await prisma.hallEvent.findMany({
    where: {
      hallId,
      endDate: { gte: dateFromISO(today) },
    },
    orderBy: [{ startDate: "asc" }, { startTime: "asc" }],
  });
  return events.map(toHallEventPublic);
}

export async function createHallEvent(input: CreateHallEventInput): Promise<ActionResult<CreateHallEventResult>> {
  if (!(await isAdmin())) {
    return { ok: false, error: "Немате пристап." };
  }

  const title = input.title.trim();
  const notes = input.notes?.trim() || undefined;
  const startTime = input.startTime?.trim() || null;
  const endTime = input.endTime?.trim() || null;

  if (title.length < 2 || title.length > 80) {
    return { ok: false, error: "Внесете наслов (2–80 знаци)." };
  }
  if (!KINDS.includes(input.kind)) {
    return { ok: false, error: "Невалиден тип на настан." };
  }
  if (!DATE_RE.test(input.startDate) || !DATE_RE.test(input.endDate)) {
    return { ok: false, error: "Невалиден датум." };
  }
  if (input.endDate < input.startDate) {
    return { ok: false, error: "Крајниот датум мора да биде после почетниот." };
  }
  if (eachDateISO(input.startDate, input.endDate).length > MAX_EVENT_DAYS) {
    return { ok: false, error: `Настанот може да трае најмногу ${MAX_EVENT_DAYS} дена.` };
  }

  const allDay = !startTime && !endTime;
  if (!allDay) {
    if (!startTime || !endTime || !TIME_RE.test(startTime) || !TIME_RE.test(endTime)) {
      return { ok: false, error: "Внесете важечки почетен и краен час." };
    }
    if (clockToMinutes(startTime) >= clockToMinutes(endTime)) {
      return { ok: false, error: "Крајниот час мора да биде после почетниот." };
    }
  }

  const hall = await prisma.hall.findUnique({ where: { id: input.hallId } });
  if (!hall) {
    return { ok: false, error: "Салата не е пронајдена." };
  }

  if (!allDay && startTime && endTime) {
    const hallSlots = generateTimeSlots(hall.slotStartHour, hall.slotEndHour, hall.slotDurationMinutes);
    const hallOpen = hallSlots[0]?.startTime;
    const hallClose = hallSlots[hallSlots.length - 1]?.endTime;
    if (!hallOpen || !hallClose) {
      return { ok: false, error: "Салата нема дефинирани термини." };
    }
    if (clockToMinutes(startTime) < clockToMinutes(hallOpen) || clockToMinutes(endTime) > clockToMinutes(hallClose)) {
      return { ok: false, error: `Часовите мора да се во работното време (${hallOpen}–${hallClose}).` };
    }
  }

  const window = { startTime, endTime };

  try {
    const { event, cancelled } = await prisma.$transaction(async (tx) => {
      const bookings = await tx.booking.findMany({
        where: {
          hallId: input.hallId,
          date: {
            gte: dateFromISO(input.startDate),
            lte: dateFromISO(input.endDate),
          },
          status: { in: ["PENDING", "CONFIRMED"] },
        },
        include: { customer: true },
      });

      const overlapping = bookings.filter((booking) =>
        eventBlocksSlot(window, { startTime: booking.startTime, endTime: booking.endTime }),
      );

      if (overlapping.length > 0 && !input.cancelConflicts) {
        throw new EventBookingConflictError(toConflicts(overlapping));
      }

      const created = await tx.hallEvent.create({
        data: {
          hallId: input.hallId,
          title,
          kind: input.kind,
          startDate: dateFromISO(input.startDate),
          endDate: dateFromISO(input.endDate),
          startTime,
          endTime,
          notes,
        },
      });

      if (overlapping.length > 0) {
        await tx.booking.updateMany({
          where: { id: { in: overlapping.map((booking) => booking.id) } },
          data: {
            status: "CANCELLED",
            cancelledAt: new Date(),
            cancelReason: "EVENT",
            cancelledByEventId: created.id,
          },
        });
      }

      return { event: created, cancelled: toConflicts(overlapping) };
    });

    revalidateEventViews();
    return { ok: true, data: { event: toHallEventPublic(event), cancelled } };
  } catch (error) {
    if (error instanceof EventBookingConflictError) {
      return conflictResult(error.conflicts);
    }
    if (
      error instanceof Error &&
      error.name === "EventBookingConflictError" &&
      "conflicts" in error &&
      Array.isArray(error.conflicts)
    ) {
      return conflictResult(error.conflicts as BookingConflict[]);
    }
    throw error;
  }
}

export async function deleteHallEvent(eventId: string): Promise<ActionResult> {
  if (!(await isAdmin())) {
    return { ok: false, error: "Немате пристап." };
  }

  const event = await prisma.hallEvent.findUnique({ where: { id: eventId } });
  if (!event) {
    return { ok: false, error: "Настанот не е пронајден." };
  }

  await prisma.hallEvent.delete({ where: { id: eventId } });
  revalidateEventViews();
  return { ok: true, data: undefined };
}
