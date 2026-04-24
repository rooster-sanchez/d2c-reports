"use client";

import { worked, didnt_work, fmtUSD, fmtROAS, WorkItem, mer_floor } from "@/lib/data";

export default function WorkedLists() {
  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <WorkList
        title="What worked"
        subtitle="Above the 2.5 floor this month"
        items={worked}
        tone="success"
      />
      <WorkList
        title="What didn't"
        subtitle="Below the 2.5 floor — where the drag is"
        items={didnt_work}
        tone="alert"
      />
    </div>
  );
}

function WorkList({
  title,
  subtitle,
  items,
  tone,
}: {
  title: string;
  subtitle: string;
  items: WorkItem[];
  tone: "success" | "alert";
}) {
  const borderClass =
    tone === "success"
      ? "border-[color:var(--success)]/30"
      : "border-[color:var(--alert)]/30";
  const headerBg =
    tone === "success"
      ? "bg-[color:var(--success-soft)]"
      : "bg-[color:var(--alert-soft)]";
  const titleColor =
    tone === "success" ? "text-[color:var(--success)]" : "text-[color:var(--alert)]";

  return (
    <div
      className={`rounded-2xl border ${borderClass} bg-[color:var(--surface)] overflow-hidden`}
    >
      <div className={`px-6 py-4 ${headerBg}`}>
        <div
          className={`text-[10px] uppercase tracking-[0.22em] font-semibold ${titleColor}`}
        >
          {subtitle}
        </div>
        <h3 className={`serif text-2xl font-semibold mt-1 ${titleColor}`}>{title}</h3>
      </div>
      <ul className="divide-y divide-[color:var(--border)]">
        {items.map((it) => {
          const aboveFloor = it.roas >= mer_floor;
          return (
            <li key={it.name} className="p-5 sm:p-6">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="mono text-[10px] uppercase tracking-[0.15em] text-[color:var(--text-tertiary)] border border-[color:var(--border)] rounded-full px-2 py-0.5">
                      {it.channel}
                    </span>
                  </div>
                  <div className="font-semibold text-[color:var(--text-primary)] leading-snug">
                    {it.friendly}
                  </div>
                  <div className="mt-0.5 mono text-[11px] text-[color:var(--text-tertiary)] truncate">
                    {it.name}
                  </div>
                </div>
                <div className="text-right flex-shrink-0">
                  <div
                    className={`serif text-3xl font-semibold numeric ${
                      aboveFloor
                        ? "text-[color:var(--success)]"
                        : "text-[color:var(--alert)]"
                    }`}
                  >
                    {fmtROAS(it.roas)}
                  </div>
                  <div className="mono text-[11px] text-[color:var(--text-tertiary)]">
                    {fmtUSD(it.spend)} → {fmtUSD(it.revenue)}
                  </div>
                </div>
              </div>
              <p className="mt-3 text-sm text-[color:var(--text-secondary)] leading-relaxed">
                {it.note}
              </p>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
