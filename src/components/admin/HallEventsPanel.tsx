"use client";

import { useState, type FormEvent } from "react";
import { createHallEvent, deleteHallEvent } from "@/actions/events";
import { EVENT_KIND_LABELS } from "@/lib/constants";
import { formatLongDate } from "@/lib/dates";
import { formatEventWhen, kindLabel } from "@/lib/events";
import { displayMkPhone } from "@/lib/phone";
import { generateTimeSlots } from "@/lib/slots";
import type { BookingConflict, CreateHallEventInput, EventKind, HallEventPublic, HallPublic } from "@/types/booking";

type Props = {
  hall: HallPublic;
  date: string;
  events: HallEventPublic[];
  onChanged: () => void;
};

const KINDS = Object.keys(EVENT_KIND_LABELS) as EventKind[];

type Draft = {
  title: string;
  kind: EventKind;
  startDate: string;
  endDate: string;
  allDay: boolean;
  startTime: string;
  endTime: string;
  notes: string;
};

function emptyDraft(date: string, startTime: string, endTime: string): Draft {
  return {
    title: "",
    kind: "HANDBALL",
    startDate: date,
    endDate: date,
    allDay: true,
    startTime,
    endTime,
    notes: "",
  };
}

function toInput(hallId: string, draft: Draft, cancelConflicts = false): CreateHallEventInput {
  return {
    hallId,
    title: draft.title,
    kind: draft.kind,
    startDate: draft.startDate,
    endDate: draft.endDate,
    startTime: draft.allDay ? null : draft.startTime,
    endTime: draft.allDay ? null : draft.endTime,
    notes: draft.notes,
    cancelConflicts,
  };
}

export function HallEventsPanel({ hall, date, events, onChanged }: Props) {
  const slots = generateTimeSlots(hall.slotStartHour, hall.slotEndHour, hall.slotDurationMinutes);
  const endHours = [...new Set(slots.map((slot) => slot.endTime))];
  const defaultStart = slots[0]?.startTime ?? "17:00";
  const defaultEnd = endHours[endHours.length - 1] ?? "23:00";

  const [draft, setDraft] = useState<Draft>(() => emptyDraft(date, defaultStart, defaultEnd));
  const [busyId, setBusyId] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [listError, setListError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [conflicts, setConflicts] = useState<BookingConflict[]>([]);
  const [cancelled, setCancelled] = useState<BookingConflict[]>([]);

  function patchDraft(patch: Partial<Draft>) {
    setDraft((current) => ({ ...current, ...patch }));
    setSuccess(null);
    setCancelled([]);
    if (
      conflicts.length > 0 &&
      (patch.startDate !== undefined ||
        patch.endDate !== undefined ||
        patch.allDay !== undefined ||
        patch.startTime !== undefined ||
        patch.endTime !== undefined)
    ) {
      setConflicts([]);
      setError(null);
    }
  }

  async function saveEvent(cancelConflicts: boolean) {
    setPending(true);
    setError(null);
    setSuccess(null);
    setListError(null);
    const result = await createHallEvent(toInput(hall.id, draft, cancelConflicts));
    setPending(false);

    if (!result.ok) {
      setError(result.error);
      setConflicts(result.conflicts ?? []);
      return false;
    }

    const cancelledSlots = result.data.cancelled;
    setConflicts([]);
    setCancelled(cancelledSlots);
    setDraft(emptyDraft(date, defaultStart, defaultEnd));
    setSuccess(
      cancelledSlots.length > 0
        ? `Настанот е додаден. Откажани се ${cancelledSlots.length} ${cancelledSlots.length === 1 ? "термин" : "термини"}.`
        : "Настанот е додаден. Термините се затворени.",
    );
    onChanged();
    return true;
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await saveEvent(false);
  }

  async function onConfirmCancelAndBlock() {
    const count = conflicts.length;
    const noun = count === 1 ? "резервација" : "резервации";
    if (!window.confirm(`Да се откажат ${count} ${noun} и да се блокира салата за овој настан?`)) {
      return;
    }
    await saveEvent(true);
  }

  async function onDelete(id: string) {
    if (!window.confirm("Да се отстрани овој настан? Термините повторно ќе бидат слободни.")) return;
    setBusyId(id);
    setListError(null);
    const result = await deleteHallEvent(id);
    setBusyId(null);
    if (!result.ok) {
      setListError(result.error);
      return;
    }
    onChanged();
  }

  const saving = pending || busyId !== null;

  return (
    <section className="space-y-3">
      <h2 className="font-semibold">Настани / затворање на салата</h2>
      <p className="text-sm text-white/55">
        Натпревари, претстави и турнири. Во тие термини никој не може да резервира.
      </p>

      <form onSubmit={onSubmit} className="space-y-3 rounded-2xl border border-white/10 bg-white/5 p-4">
        <label className="block">
          <span className="mb-1 block text-xs text-white/55">Наслов</span>
          <input
            name="title"
            required
            minLength={2}
            maxLength={80}
            value={draft.title}
            onChange={(event) => patchDraft({ title: event.target.value })}
            placeholder="нпр. Ракометен натпревар Ресен"
            className="w-full rounded-xl border border-white/10 bg-background px-3 py-2 text-sm outline-none focus:border-lime"
          />
        </label>

        <label className="block">
          <span className="mb-1 block text-xs text-white/55">Тип</span>
          <select
            name="kind"
            value={draft.kind}
            onChange={(event) => patchDraft({ kind: event.target.value as EventKind })}
            className="w-full rounded-xl border border-white/10 bg-background px-3 py-2 text-sm outline-none focus:border-lime"
          >
            {KINDS.map((kind) => (
              <option key={kind} value={kind}>
                {EVENT_KIND_LABELS[kind]}
              </option>
            ))}
          </select>
        </label>

        <div className="grid grid-cols-2 gap-2">
          <label className="block">
            <span className="mb-1 block text-xs text-white/55">Од датум</span>
            <input
              type="date"
              name="startDate"
              value={draft.startDate}
              onChange={(event) => patchDraft({ startDate: event.target.value })}
              required
              className="w-full rounded-xl border border-white/10 bg-background px-3 py-2 text-sm outline-none focus:border-lime"
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-xs text-white/55">До датум</span>
            <input
              type="date"
              name="endDate"
              value={draft.endDate}
              onChange={(event) => patchDraft({ endDate: event.target.value })}
              required
              className="w-full rounded-xl border border-white/10 bg-background px-3 py-2 text-sm outline-none focus:border-lime"
            />
          </label>
        </div>

        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={draft.allDay}
            onChange={(event) => patchDraft({ allDay: event.target.checked })}
            className="size-4 accent-lime"
          />
          Цел работен ден (сите термини)
        </label>

        {!draft.allDay ? (
          <div className="grid grid-cols-2 gap-2">
            <label className="block">
              <span className="mb-1 block text-xs text-white/55">Од час</span>
              <select
                name="startTime"
                value={draft.startTime}
                onChange={(event) => patchDraft({ startTime: event.target.value })}
                className="w-full rounded-xl border border-white/10 bg-background px-3 py-2 text-sm outline-none focus:border-lime"
              >
                {slots.map((slot) => (
                  <option key={slot.startTime} value={slot.startTime}>
                    {slot.startTime}
                  </option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="mb-1 block text-xs text-white/55">До час</span>
              <select
                name="endTime"
                value={draft.endTime}
                onChange={(event) => patchDraft({ endTime: event.target.value })}
                className="w-full rounded-xl border border-white/10 bg-background px-3 py-2 text-sm outline-none focus:border-lime"
              >
                {endHours.map((time) => (
                  <option key={time} value={time}>
                    {time}
                  </option>
                ))}
              </select>
            </label>
          </div>
        ) : null}

        <label className="block">
          <span className="mb-1 block text-xs text-white/55">Белешка (опционално)</span>
          <input
            name="notes"
            value={draft.notes}
            onChange={(event) => patchDraft({ notes: event.target.value })}
            placeholder="нпр. полуфинале, гостинска екипа"
            className="w-full rounded-xl border border-white/10 bg-background px-3 py-2 text-sm outline-none focus:border-lime"
          />
        </label>

        {error ? <p className="text-sm text-booked">{error}</p> : null}

        {conflicts.length > 0 ? (
          <ul className="space-y-2">
            {conflicts.map((booking) => (
              <li
                key={booking.id}
                className="rounded-xl border border-booked/30 bg-booked/10 px-3 py-2.5"
              >
                <p className="text-sm font-semibold">
                  {booking.startTime}–{booking.endTime}
                </p>
                <p className="text-xs capitalize text-white/60">{formatLongDate(booking.date)}</p>
                <p className="mt-1 text-sm">
                  {booking.name} · {displayMkPhone(booking.phone)}
                </p>
                <p className="mt-0.5 text-xs text-white/45">
                  {booking.source === "PHONE" ? "Телефон" : "Онлајн"}
                </p>
              </li>
            ))}
          </ul>
        ) : null}

        {cancelled.length > 0 ? (
          <ul className="space-y-2">
            {cancelled.map((booking) => (
              <li
                key={booking.id}
                className="rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2.5 text-white/70"
              >
                <p className="text-xs font-medium uppercase tracking-wide text-booked">Откажано</p>
                <p className="mt-0.5 text-sm font-semibold">
                  {booking.startTime}–{booking.endTime}
                </p>
                <p className="text-xs capitalize text-white/55">{formatLongDate(booking.date)}</p>
                <p className="mt-1 text-sm">
                  {booking.name} · {displayMkPhone(booking.phone)}
                </p>
              </li>
            ))}
          </ul>
        ) : null}

        {success ? <p className="text-sm text-available">{success}</p> : null}

        {conflicts.length > 0 ? (
          <button
            type="button"
            disabled={saving}
            onClick={() => void onConfirmCancelAndBlock()}
            className="w-full rounded-xl bg-lime py-2.5 text-sm font-semibold text-pitch disabled:opacity-60"
          >
            {pending ? "Се зачувува…" : "Блокирај и откажи ги термините"}
          </button>
        ) : (
          <button
            type="submit"
            disabled={saving}
            className="w-full rounded-xl bg-lime py-2.5 text-sm font-semibold text-pitch disabled:opacity-60"
          >
            {pending ? "Се зачувува…" : "Блокирај термини"}
          </button>
        )}
      </form>

      {listError ? <p className="text-sm text-booked">{listError}</p> : null}

      {events.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-white/15 px-4 py-6 text-center text-sm text-white/50">
          Нема закажани настани.
        </p>
      ) : (
        <ul className="space-y-2">
          {events.map((event) => (
            <li
              key={event.id}
              className="rounded-2xl border border-blocked/25 bg-blocked/10 px-4 py-3"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-blocked">
                    {kindLabel(event.kind)}
                  </p>
                  <p className="mt-0.5 font-semibold">{event.title}</p>
                  <p className="mt-1 text-sm capitalize text-white/60">{formatEventWhen(event)}</p>
                  {event.notes ? <p className="mt-1 text-xs text-white/45">{event.notes}</p> : null}
                </div>
                <button
                  type="button"
                  disabled={busyId === event.id}
                  onClick={() => void onDelete(event.id)}
                  className="rounded-xl border border-white/20 px-3 py-1.5 text-xs font-medium text-white/70 disabled:opacity-50"
                >
                  {busyId === event.id ? "…" : "Отстрани"}
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
