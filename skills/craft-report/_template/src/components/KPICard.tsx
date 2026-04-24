"use client";

import Delta from "./Delta";

type Props = {
  label: string;
  value: string;
  sublabel?: string;
  deltas?: {
    now: number;
    then: number;
    label: string;
    inverse?: boolean;
    currency?: boolean;
  }[];
  accent?: "sage" | "river" | "sand" | "alert" | "neutral";
  icon?: React.ReactNode;
  big?: boolean;
};

const accentClass: Record<string, string> = {
  sage: "border-[color:var(--sage)]/30",
  river: "border-[color:var(--river)]/30",
  sand: "border-[color:var(--sand)]",
  alert: "border-[color:var(--alert)]/40",
  neutral: "border-[color:var(--border)]",
};

export default function KPICard({ label, value, sublabel, deltas, accent = "sage", icon, big }: Props) {
  return (
    <div
      className={`relative overflow-hidden rounded-2xl border bg-[color:var(--surface)] ${accentClass[accent]}`}
    >
      <div className="p-5 sm:p-6">
        <div className="flex items-center justify-between gap-3 mb-3">
          <div className="text-[11px] uppercase tracking-[0.2em] text-[color:var(--text-tertiary)] font-medium">
            {label}
          </div>
          {icon ? <div className="opacity-85">{icon}</div> : null}
        </div>
        <div
          className={`serif font-semibold tracking-tight numeric text-[color:var(--text-primary)] ${
            big ? "text-5xl sm:text-6xl" : "text-3xl sm:text-4xl"
          }`}
        >
          {value}
        </div>
        {sublabel ? (
          <div className="mt-1 text-sm text-[color:var(--text-secondary)]">{sublabel}</div>
        ) : null}
        {deltas && deltas.length > 0 ? (
          <div className="mt-4 flex flex-wrap gap-x-4 gap-y-2 pt-4 border-t border-[color:var(--border)]">
            {deltas.map((d, i) => (
              <Delta key={i} {...d} />
            ))}
          </div>
        ) : null}
      </div>
    </div>
  );
}
