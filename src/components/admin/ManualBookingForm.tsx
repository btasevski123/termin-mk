"use client";

import { useActionState, useEffect, useRef } from "react";
import { createBooking } from "@/actions/bookings";
import { generateTimeSlots, eventBlocksSlot, eventCoversDate } from "@/lib/slots";
import type { HallEventPublic, HallPublic } from "@/types/booking";

type Props = {
  hall: HallPublic;
  date: string;
  startTime?: string;
  events: HallEventPublic[];
  onCreated: () => void;
};

type FormState = { error?: string; success?: boolean };

async function submitManual(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const startTime = String(formData.get("startTime"));
  const [hour] = startTime.split(":").map(Number);
  const duration = Number(formData.get("duration"));
  const endHour = hour + duration / 60;
  const endTime = `${String(endHour).padStart(2, "0")}:00`;

  const result = await createBooking({
    hallId: String(formData.get("hallId")),
    date: String(formData.get("date")),
    startTime,
    endTime,
    name: String(formData.get("name") ?? ""),
    phone: String(formData.get("phone") ?? ""),
    notes: String(formData.get("notes") ?? ""),
    source: "PHONE",
  });

  if (!result.ok) {
    return { error: result.error };
  }

  return { success: true };
}

export function ManualBookingForm({ hall, date, startTime, events, onCreated }: Props) {
  const slots = generateTimeSlots(hall.slotStartHour, hall.slotEndHour, hall.slotDurationMinutes);
  const openSlots = slots.filter(
    (slot) => !events.some((event) => eventCoversDate(event, date) && eventBlocksSlot(event, slot)),
  );
  const [state, formAction, pending] = useActionState(submitManual, {});

  const onCreatedRef = useRef(onCreated);
  onCreatedRef.current = onCreated;

  useEffect(() => {
    if (state.success) {
      onCreatedRef.current();
    }
  }, [state.success]);

  return (
    <form action={formAction} className="space-y-3 rounded-2xl border border-white/10 bg-white/5 p-4">
      <h3 className="font-semibold">Додај телефонска резервација</h3>
      <input type="hidden" name="hallId" value={hall.id} />
      <input type="hidden" name="duration" value={hall.slotDurationMinutes} />

      <div className="grid grid-cols-2 gap-2">
        <label className="block">
          <span className="mb-1 block text-xs text-white/55">Датум</span>
          <input
            type="date"
            name="date"
            defaultValue={date}
            required
            className="w-full rounded-xl border border-white/10 bg-background px-3 py-2 text-sm outline-none focus:border-lime"
          />
        </label>
        <label className="block">
          <span className="mb-1 block text-xs text-white/55">Термин</span>
          <select
            name="startTime"
            defaultValue={startTime && openSlots.some((slot) => slot.startTime === startTime) ? startTime : openSlots[0]?.startTime}
            disabled={openSlots.length === 0}
            className="w-full rounded-xl border border-white/10 bg-background px-3 py-2 text-sm outline-none focus:border-lime"
          >
            {openSlots.map((slot) => (
              <option key={slot.startTime} value={slot.startTime}>
                {slot.startTime}–{slot.endTime}
              </option>
            ))}
          </select>
        </label>
      </div>

      <label className="block">
        <span className="mb-1 block text-xs text-white/55">Име</span>
        <input
          name="name"
          required
          placeholder="Име и презиме"
          className="w-full rounded-xl border border-white/10 bg-background px-3 py-2 text-sm outline-none focus:border-lime"
        />
      </label>

      <label className="block">
        <span className="mb-1 block text-xs text-white/55">Телефон</span>
        <input
          name="phone"
          type="tel"
          required
          placeholder="070 123 456"
          className="w-full rounded-xl border border-white/10 bg-background px-3 py-2 text-sm outline-none focus:border-lime"
        />
      </label>

      <label className="block">
        <span className="mb-1 block text-xs text-white/55">Белешка (опционално)</span>
        <input
          name="notes"
          placeholder="нпр. редовна екипа"
          className="w-full rounded-xl border border-white/10 bg-background px-3 py-2 text-sm outline-none focus:border-lime"
        />
      </label>

      {openSlots.length === 0 ? (
        <p className="text-sm text-blocked">Сите термини за овој ден се затворени поради настан.</p>
      ) : null}

      {state.error ? <p className="text-sm text-booked">{state.error}</p> : null}
      {state.success ? <p className="text-sm text-available">Резервацијата е додадена.</p> : null}

      <button
        type="submit"
        disabled={pending || openSlots.length === 0}
        className="w-full rounded-xl bg-lime py-2.5 text-sm font-semibold text-pitch disabled:opacity-60"
      >
        {pending ? "Се зачувува…" : "Зачувај"}
      </button>
    </form>
  );
}
