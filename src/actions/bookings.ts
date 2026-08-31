"use server";

import { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { isAdmin, requireAdmin } from "@/lib/admin";
import { DAYS_AHEAD } from "@/lib/constants";
import { dateFromISO, isSlotInPast, isWithinBookingHorizon, todayInTimeZone, weekDates } from "@/lib/dates";
import { normalizeMkPhone } from "@/lib/phone";
import { prisma } from "@/lib/prisma";
import { activeBookingSlotKey, eventBlocksSlot, generateTimeSlots } from "@/lib/slots";
import type { ActionResult, BookingWithCustomer, CreateBookingInput } from "@/types/booking";

function revalidateBookingViews() {
  revalidatePath("/");
  revalidatePath("/admin");
}

function isUniqueViolation(error: unknown, field: string): boolean {
  if (!(error instanceof Prisma.PrismaClientKnownRequestError) || error.code !== "P2002") {
    return false;
  }
  const target = error.meta?.target;
  if (Array.isArray(target)) return target.includes(field);
  return typeof target === "string" && target.includes(field);
}

const SLOT_TAKEN = {
  ok: false as const,
  error: "Терминот е веќе зафатен.",
  code: "SLOT_TAKEN" as const,
};

export async function createBooking(
  input: CreateBookingInput,
): Promise<ActionResult<BookingWithCustomer>> {
  const name = input.name.trim();
  const phone = normalizeMkPhone(input.phone);
  const notes = input.notes?.trim() || undefined;
  const admin = await isAdmin();
  const source = admin && input.source === "PHONE" ? "PHONE" : "ONLINE";

  if (name.length < 2 || name.length > 60) {
    return { ok: false, error: "Внесете име (најмалку 2 букви)." };
  }
  if (!phone) {
    return { ok: false, error: "Внесете важечки македонски број (07X XXX XXX)." };
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(input.date)) {
    return { ok: false, error: "Невалиден датум." };
  }
  if (input.date < todayInTimeZone()) {
    return { ok: false, error: "Не може да се резервира минат датум." };
  }
  if (!admin && !isWithinBookingHorizon(input.date)) {
    return {
      ok: false,
      error: `Не може да се резервира повеќе од ${DAYS_AHEAD} дена однапред.`,
    };
  }
  if (isSlotInPast(input.date, input.startTime)) {
    return { ok: false, error: "Овој термин веќе помина." };
  }

  const hall = await prisma.hall.findUnique({ where: { id: input.hallId } });
  if (!hall) {
    return { ok: false, error: "Салата не е пронајдена." };
  }

  const validSlot = generateTimeSlots(
    hall.slotStartHour,
    hall.slotEndHour,
    hall.slotDurationMinutes,
  ).find((slot) => slot.startTime === input.startTime && slot.endTime === input.endTime);

  if (!validSlot) {
    return { ok: false, error: "Невалиден термин." };
  }

  try {
    const booking = await prisma.$transaction(async (tx) => {
      const taken = await tx.booking.findFirst({
        where: {
          hallId: input.hallId,
          date: dateFromISO(input.date),
          startTime: input.startTime,
          status: { in: ["PENDING", "CONFIRMED"] },
        },
        select: { id: true },
      });

      if (taken) {
        throw new Error("SLOT_TAKEN");
      }

      const events = await tx.hallEvent.findMany({
        where: {
          hallId: input.hallId,
          startDate: { lte: dateFromISO(input.date) },
          endDate: { gte: dateFromISO(input.date) },
        },
      });

      const blocked = events.some((event) =>
        eventBlocksSlot(event, { startTime: input.startTime, endTime: input.endTime }),
      );
      if (blocked) {
        throw new Error("SLOT_BLOCKED");
      }

      const customer = await tx.customer.upsert({
        where: { phone },
        update: { name },
        create: { name, phone },
      });

      return tx.booking.create({
        data: {
          date: dateFromISO(input.date),
          startTime: input.startTime,
          endTime: input.endTime,
          status: "CONFIRMED",
          source,
          notes,
          customerId: customer.id,
          hallId: input.hallId,
          activeSlotKey: activeBookingSlotKey(input.hallId, input.date, input.startTime),
        },
        include: { customer: true },
      });
    });

    revalidateBookingViews();
    return { ok: true, data: booking };
  } catch (error) {
    if (error instanceof Error && error.message === "SLOT_TAKEN") {
      revalidateBookingViews();
      return SLOT_TAKEN;
    }
    if (error instanceof Error && error.message === "SLOT_BLOCKED") {
      revalidateBookingViews();
      return {
        ok: false,
        error: "Салата е затворена за овој термин поради настан.",
        code: "SLOT_BLOCKED",
      };
    }
    if (isUniqueViolation(error, "activeSlotKey")) {
      revalidateBookingViews();
      return SLOT_TAKEN;
    }
    return { ok: false, error: "Неуспешна резервација. Обидете се повторно." };
  }
}

export async function cancelBooking(bookingId: string): Promise<ActionResult> {
  const auth = await requireAdmin();
  if (!auth.ok) return auth;

  const booking = await prisma.booking.findUnique({ where: { id: bookingId } });
  if (!booking) {
    return { ok: false, error: "Резервацијата не е пронајдена." };
  }
  if (booking.status === "CANCELLED") {
    return { ok: false, error: "Резервацијата е веќе откажана." };
  }

  await prisma.booking.update({
    where: { id: bookingId },
    data: {
      status: "CANCELLED",
      cancelledAt: new Date(),
      cancelReason: "ADMIN",
      activeSlotKey: null,
    },
  });

  revalidateBookingViews();
  return { ok: true, data: undefined };
}

export async function getBookingsForRange(
  hallId: string,
  fromISO: string,
  toISO: string,
): Promise<ActionResult<BookingWithCustomer[]>> {
  const auth = await requireAdmin();
  if (!auth.ok) return auth;

  const bookings = await prisma.booking.findMany({
    where: {
      hallId,
      date: {
        gte: dateFromISO(fromISO),
        lte: dateFromISO(toISO),
      },
    },
    include: {
      customer: true,
      cancelledByEvent: { select: { id: true, title: true } },
    },
    orderBy: [{ date: "asc" }, { startTime: "asc" }],
  });

  return { ok: true, data: bookings };
}

export async function getWeekBookings(
  hallId: string,
  dateISO: string,
): Promise<ActionResult<{ days: string[]; bookings: BookingWithCustomer[] }>> {
  const days = weekDates(dateISO);
  const result = await getBookingsForRange(hallId, days[0], days[6]);
  if (!result.ok) return result;
  return { ok: true, data: { days, bookings: result.data } };
}
