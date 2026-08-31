"use client";

import { useActionState, useEffect, useRef } from "react";
import { createBooking } from "@/actions/bookings";
import { formatLongDate } from "@/lib/dates";
import type { TimeSlotView } from "@/types/booking";

type Props = {
  hallId: string;
  date: string;
  slot: TimeSlotView;
  onClose: () => void;
  onBooked: () => void;
};

type FormState = { error?: string; success?: boolean; refresh?: boolean };

async function submitBooking(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const result = await createBooking({
    hallId: String(formData.get("hallId")),
    date: String(formData.get("date")),
    startTime: String(formData.get("startTime")),
    endTime: String(formData.get("endTime")),
    name: String(formData.get("name") ?? ""),
    phone: String(formData.get("phone") ?? ""),
    source: "ONLINE",
  });

  if (!result.ok) {
    return {
      error: result.error,
      refresh: result.code === "SLOT_TAKEN" || result.code === "SLOT_BLOCKED",
    };
  }

  return { success: true };
}

export function BookingModal({ hallId, date, slot, onClose, onBooked }: Props) {
  const nameRef = useRef<HTMLInputElement>(null);
  const [state, formAction, pending] = useActionState(submitBooking, {});

  useEffect(() => {
    nameRef.current?.focus();
  }, []);

  const onBookedRef = useRef(onBooked);
  onBookedRef.current = onBooked;

  useEffect(() => {
    if (state.success || state.refresh) {
      onBookedRef.current();
    }
  }, [state.success, state.refresh]);

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
      <button
        type="button"
        aria-label="Затвори"
        className="absolute inset-0 bg-black/70"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-labelledby="booking-title"
        className="relative w-full max-w-md rounded-t-3xl border border-white/10 bg-pitch px-5 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-5 sm:rounded-3xl"
      >
        <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-white/20 sm:hidden" />
        {state.success ? (
          <div className="py-8 text-center">
            <p className="text-3xl">✓</p>
            <h2 id="booking-title" className="mt-3 text-xl font-bold">
              Терминот е резервиран
            </h2>
            <p className="mt-2 text-white/70">
              {formatLongDate(date)} · {slot.startTime}–{slot.endTime}
            </p>
            <button
              type="button"
              onClick={onClose}
              className="mt-6 w-full rounded-2xl bg-lime py-3.5 font-semibold text-pitch"
            >
              Во ред
            </button>
          </div>
        ) : (
          <>
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm text-white/55">Резервирај термин</p>
                <h2 id="booking-title" className="text-xl font-bold">
                  {slot.startTime}–{slot.endTime}
                </h2>
                <p className="text-sm capitalize text-white/70">{formatLongDate(date)}</p>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="rounded-full px-3 py-1 text-sm text-white/60 hover:bg-white/10"
              >
                Затвори
              </button>
            </div>

            <form action={formAction} className="mt-5 space-y-3">
              <input type="hidden" name="hallId" value={hallId} />
              <input type="hidden" name="date" value={date} />
              <input type="hidden" name="startTime" value={slot.startTime} />
              <input type="hidden" name="endTime" value={slot.endTime} />

              <label className="block">
                <span className="mb-1.5 block text-sm text-white/70">Име и презиме</span>
                <input
                  ref={nameRef}
                  name="name"
                  required
                  autoComplete="name"
                  placeholder="нпр. Марко Стојанов"
                  className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-base outline-none placeholder:text-white/30 focus:border-lime"
                />
              </label>

              <label className="block">
                <span className="mb-1.5 block text-sm text-white/70">Телефон</span>
                <input
                  name="phone"
                  type="tel"
                  required
                  inputMode="tel"
                  autoComplete="tel"
                  placeholder="070 123 456"
                  className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-base outline-none placeholder:text-white/30 focus:border-lime"
                />
              </label>

              {state.error ? (
                <p className="rounded-xl bg-booked/15 px-3 py-2 text-sm text-booked">{state.error}</p>
              ) : null}

              <button
                type="submit"
                disabled={pending}
                className="w-full rounded-2xl bg-lime py-3.5 text-base font-semibold text-pitch disabled:opacity-60"
              >
                {pending ? "Се резервира…" : "Потврди резервација"}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
