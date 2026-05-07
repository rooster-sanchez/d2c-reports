export type Priority = {
  index: string;
  title: string;
};

export default function ActionPlan({ priorities }: { priorities: Priority[] }) {
  return (
    <div className="grid gap-5 md:grid-cols-3">
      {priorities.map((p) => (
        <div
          key={p.index}
          className="rounded-2xl border border-[color:var(--border)] bg-[color:var(--surface)] p-6"
        >
          <div className="flex items-center gap-3">
            <span className="text-3xl font-semibold numeric tracking-tight text-[color:var(--sage-deep)]">
              {p.index}
            </span>
            <svg
              width="22"
              height="22"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#7A825F"
              strokeWidth="1.75"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden
            >
              <path d="M5 12h14" />
              <path d="M13 6l6 6-6 6" />
            </svg>
          </div>
          <h3 className="mt-3 text-xl font-semibold text-[color:var(--text-primary)] leading-snug tracking-tight">
            {p.title}
          </h3>
        </div>
      ))}
    </div>
  );
}
