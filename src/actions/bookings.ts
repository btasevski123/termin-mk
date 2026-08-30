"use server";

import { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { dateFromISO, isSlotInPast, todayInTimeZone, weekDates } from "@/lib/dates";
import { normalizeMkPhone } from "@/lib/phone";
import { prisma } from "@/lib/prisma";
import { generateTimeSlots } from "@/lib/slots";
import type { ActionResult, BookingWithCustomer, CreateBookingInput } from "@/types/booking";

function revalidateBookingViews() {
  revalidatePath("/");
  revalidatePath("/admin");
}

export async function createBooking(
  input: CreateBookingInput,
): Promise<ActionResult<BookingWithCustomer>> {
  const name = input.name.trim();
  const phone = normalizeMkPhone(input.phone);
  const notes = input.notes?.trim() || undefined;

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
    const booking = await prisma.$transaction(
      async (tx) => {
        const taken = await tx.booking.findFirst({
          where: {
            hallId: input.hallId,
            date: dateFromISO(input.date),
            startTime: input.startTime,
            status: { in: ["PENDING", "CONFIRMED"] },
          },
        });

        if (taken) {
          throw new Error("SLOT_TAKEN");
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
            source: input.source ?? "ONLINE",
            notes,
            customerId: customer.id,
            hallId: input.hallId,
          },
          include: { customer: true },
        });
      },
      { isolationLevel: "Serializable" },
    );

    revalidateBookingViews();
    return { ok: true, data: booking };
  } catch (error) {
    if (error instanceof Error && error.message === "SLOT_TAKEN") {
      return { ok: false, error: "Терминот е веќе зафатен." };
    }
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2034") {
      return { ok: false, error: "Терминот е веќе зафатен." };
    }
    return { ok: false, error: "Неуспешна резервација. Обидете се повторно." };
  }
}

export async function cancelBooking(bookingId: string): Promise<ActionResult> {
  const booking = await prisma.booking.findUnique({ where: { id: bookingId } });
  if (!booking) {
    return { ok: false, error: "Резервацијата не е пронајдена." };
  }
  if (booking.status === "CANCELLED") {
    return { ok: false, error: "Резервацијата е веќе откажана." };
  }

  await prisma.booking.update({
    where: { id: bookingId },
    data: { status: "CANCELLED" },
  });

  revalidateBookingViews();
  return { ok: true, data: undefined };
}

export async function getBookingsForRange(
  hallId: string,
  fromISO: string,
  toISO: string,
): Promise<BookingWithCustomer[]> {
  return prisma.booking.findMany({
    where: {
      hallId,
      date: {
        gte: dateFromISO(fromISO),
        lte: dateFromISO(toISO),
      },
      status: { in: ["PENDING", "CONFIRMED"] },
    },
    include: { customer: true },
    orderBy: [{ date: "asc" }, { startTime: "asc" }],
  });
}

export async function getWeekBookings(hallId: string, dateISO: string) {
  const days = weekDates(dateISO);
  const bookings = await getBookingsForRange(hallId, days[0], days[6]);
  return { days, bookings };
}
