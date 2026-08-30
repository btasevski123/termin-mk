type IconProps = {
  className?: string;
};

export const iconButtonClass =
  "inline-flex size-10 shrink-0 items-center justify-center rounded-full border border-white/15 text-white/75 transition hover:border-lime/40 hover:bg-white/10 hover:text-lime";

export function CalendarIcon({ className = "size-5" }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect x="3.25" y="5.25" width="17.5" height="15.5" rx="2.5" stroke="currentColor" strokeWidth="1.75" />
      <path d="M3.25 10h17.5" stroke="currentColor" strokeWidth="1.75" />
      <path d="M8 3.5v4M16 3.5v4" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
    </svg>
  );
}

export function LogOutIcon({ className = "size-5" }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M9.5 4.5H7A2.5 2.5 0 0 0 4.5 7v10A2.5 2.5 0 0 0 7 19.5h2.5"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
      />
      <path
        d="M14 12h5.5m0 0L16 8.5M19.5 12 16 15.5"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function AdminIcon({ className = "size-5" }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="8" r="3.25" stroke="currentColor" strokeWidth="1.75" />
      <path
        d="M5.5 19.25c.7-3.15 3.3-5 6.5-5s5.8 1.85 6.5 5"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
      />
    </svg>
  );
}
