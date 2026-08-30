import type { Booking, BookingSource, BookingStatus, Customer, Hall } from "@prisma/client";

export type SlotStatus = "available" | "booked" | "past";

export type TimeSlotView = {
  startTime: string;
  endTime: string;
  status: SlotStatus;
};

export type HallPublic = Pick<
  Hall,
  "id" | "name" | "location" | "slug" | "timezone" | "slotStartHour" | "slotEndHour" | "slotDurationMinutes"
>;

export type BookingWithCustomer = Booking & { customer: Customer };

export type ActionResult<T = void> =
  | { ok: true; data: T }
  | { ok: false; error: string };

export type CreateBookingInput = {
  hallId: string;
  date: string;
  startTime: string;
  endTime: string;
  name: string;
  phone: string;
  notes?: string;
  source?: BookingSource;
};

export type { BookingSource, BookingStatus, Customer, Hall };
