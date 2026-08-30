import type {
  Booking,
  BookingCancelReason,
  BookingSource,
  BookingStatus,
  Customer,
  EventKind,
  Hall,
  HallEvent,
} from "@prisma/client";

export type SlotStatus = "available" | "booked" | "past" | "blocked";

export type TimeSlotView = {
  startTime: string;
  endTime: string;
  status: SlotStatus;
  label?: string;
};

export type HallEventPublic = {
  id: string;
  hallId: string;
  title: string;
  kind: EventKind;
  startDate: string;
  endDate: string;
  startTime: string | null;
  endTime: string | null;
  notes: string | null;
};

export type CreateHallEventInput = {
  hallId: string;
  title: string;
  kind: EventKind;
  startDate: string;
  endDate: string;
  startTime?: string | null;
  endTime?: string | null;
  notes?: string;
  cancelConflicts?: boolean;
};

export type CreateHallEventResult = {
  event: HallEventPublic;
  cancelled: BookingConflict[];
};

export type HallPublic = Pick<
  Hall,
  "id" | "name" | "location" | "slug" | "timezone" | "slotStartHour" | "slotEndHour" | "slotDurationMinutes"
>;

export type BookingWithCustomer = Booking & {
  customer: Customer;
  cancelledByEvent?: Pick<HallEvent, "id" | "title"> | null;
};

export type BookingConflict = {
  id: string;
  date: string;
  startTime: string;
  endTime: string;
  name: string;
  phone: string;
  source: BookingSource;
};

export type ActionResult<T = void> =
  | { ok: true; data: T }
  | { ok: false; error: string; conflicts?: BookingConflict[] };

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

export type { BookingCancelReason, BookingSource, BookingStatus, Customer, EventKind, Hall, HallEvent };
