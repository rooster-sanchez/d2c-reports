import type { ReactNode } from "react";

export default function CreativeInsights({ insights }: { insights: ReactNode[] }) {
  if (!insights.length) return null;
  return (
    <ol className="grid gap-4 md:grid-cols-2">
      {insights.map((insight, i) => (
        <li
          key={i}
          className="flex gap-4 rounded-2xl border border-[color:var(--border)] bg-[color:var(--surface)] p-5"
        >
          <span className="shrink-0 text-2xl font-semibold numeric tracking-tight text-[color:var(--sage-deep)] leading-none mt-0.5">
            {String(i + 1).padStart(2, "0")}
          </span>
          <div className="text-sm text-[color:var(--text-secondary)] leading-relaxed">
            {insight}
          </div>
        </li>
      ))}
    </ol>
  );
}
