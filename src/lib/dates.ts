import { DAYS_AHEAD, MONTHS_MK, TIMEZONE, WEEKDAYS_FULL_MK, WEEKDAYS_MK } from "./constants";

export function todayInTimeZone(now = new Date(), timeZone = TIMEZONE): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}

export function timeInTimeZone(now = new Date(), timeZone = TIMEZONE): string {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(now);
}

export function dateFromISO(iso: string): Date {
  const [year, month, day] = iso.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day));
}

export function toISODate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export function addDaysISO(iso: string, days: number): string {
  const date = dateFromISO(iso);
  date.setUTCDate(date.getUTCDate() + days);
  return toISODate(date);
}

export function upcomingDays(count: number, fromISO = todayInTimeZone()): string[] {
  return Array.from({ length: count }, (_, index) => addDaysISO(fromISO, index));
}

/** Inclusive last calendar day guests may book (today + DAYS_AHEAD - 1). */
export function lastBookableDateISO(fromISO = todayInTimeZone()): string {
  return addDaysISO(fromISO, DAYS_AHEAD - 1);
}

export function isWithinBookingHorizon(dateISO: string, fromISO = todayInTimeZone()): boolean {
  return dateISO >= fromISO && dateISO <= lastBookableDateISO(fromISO);
}

export function eachDateISO(fromISO: string, toISO: string): string[] {
  if (fromISO > toISO) return [];
  const dates: string[] = [];
  let current = fromISO;
  while (current <= toISO) {
    dates.push(current);
    current = addDaysISO(current, 1);
  }
  return dates;
}

export function startOfWeekMonday(iso: string): string {
  const date = dateFromISO(iso);
  const day = date.getUTCDay();
  const diff = day === 0 ? -6 : 1 - day;
  date.setUTCDate(date.getUTCDate() + diff);
  return toISODate(date);
}

export function weekDates(iso: string): string[] {
  const monday = startOfWeekMonday(iso);
  return Array.from({ length: 7 }, (_, index) => addDaysISO(monday, index));
}

export function formatDayLabel(iso: string): { weekday: string; day: number; month: string } {
  const date = dateFromISO(iso);
  return {
    weekday: WEEKDAYS_MK[date.getUTCDay()],
    day: date.getUTCDate(),
    month: MONTHS_MK[date.getUTCMonth()],
  };
}

export function formatLongDate(iso: string): string {
  const date = dateFromISO(iso);
  const weekday = WEEKDAYS_FULL_MK[date.getUTCDay()];
  const month = MONTHS_MK[date.getUTCMonth()];
  return `${weekday}, ${date.getUTCDate()} ${month}`;
}

export function isSlotInPast(
  dateISO: string,
  startTime: string,
  now = new Date(),
  timeZone = TIMEZONE,
): boolean {
  const today = todayInTimeZone(now, timeZone);
  if (dateISO < today) return true;
  if (dateISO > today) return false;
  return startTime <= timeInTimeZone(now, timeZone);
}
