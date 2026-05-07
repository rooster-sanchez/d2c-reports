import { worked_moves, didnt_moves, type Move } from "@/lib/data";

export default function WorkedLists() {
  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <MoveList
        title="What worked"
        subtitle="Strategic moves that landed"
        items={worked_moves}
        tone="success"
      />
      <MoveList
        title="What didn't"
        subtitle="Moves that missed"
        items={didnt_moves}
        tone="alert"
      />
    </div>
  );
}

function MoveList({
  title,
  subtitle,
  items,
  tone,
}: {
  title: string;
  subtitle: string;
  items: Move[];
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
        {items.map((it, i) => (
          <li key={i} className="p-5 sm:p-6">
            <div className="flex items-start justify-between gap-4">
              <div className="font-semibold text-[color:var(--text-primary)] leading-snug">
                {it.title}
              </div>
              {it.stat ? (
                <div className="mono text-xs text-[color:var(--text-tertiary)] flex-shrink-0 mt-1">
                  {it.stat}
                </div>
              ) : null}
            </div>
            {it.detail ? (
              <p className="mt-2 text-sm text-[color:var(--text-secondary)] leading-relaxed">
                {it.detail}
              </p>
            ) : null}
          </li>
        ))}
      </ul>
    </div>
  );
}
