import type { TimeSlotView } from "@/types/booking";

const styles = {
  available:
    "border-available/40 bg-available/15 text-available hover:border-available hover:bg-available/25 active:scale-[0.98]",
  booked: "cursor-not-allowed border-white/10 bg-booked/10 text-booked/80 opacity-65",
  blocked: "cursor-not-allowed border-blocked/30 bg-blocked/10 text-blocked",
  past: "cursor-not-allowed border-white/5 bg-white/5 text-white/35",
} as const;

function statusLabel(slot: TimeSlotView): string {
  if (slot.status === "available") return "Слободно";
  if (slot.status === "booked") return "Зафатено";
  if (slot.status === "past") return "Поминато";
  return slot.label ?? "Затворено";
}

type Props = {
  slot: TimeSlotView;
  selected?: boolean;
  onSelect?: (slot: TimeSlotView) => void;
};

export function TimeSlotButton({ slot, selected, onSelect }: Props) {
  const disabled = slot.status !== "available";

  return (
    <button
      type="button"
      disabled={disabled}
      onClick={() => onSelect?.(slot)}
      className={`flex min-h-16 w-full items-center justify-between rounded-2xl border px-4 py-3 text-left transition ${styles[slot.status]} ${
        selected ? "ring-2 ring-lime ring-offset-2 ring-offset-background" : ""
      }`}
    >
      <span className="text-lg font-semibold tracking-wide">
        {slot.startTime}–{slot.endTime}
      </span>
      <span className="flex items-center gap-2">
        <span className="text-sm font-medium">{statusLabel(slot)}</span>
        {slot.status === "available" ? (
          <svg
            className="size-4 shrink-0 opacity-80"
            viewBox="0 0 16 16"
            fill="none"
            aria-hidden="true"
          >
            <path
              d="M6 3.5 11 8l-5 4.5"
              stroke="currentColor"
              strokeWidth="1.75"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        ) : null}
      </span>
    </button>
  );
}
