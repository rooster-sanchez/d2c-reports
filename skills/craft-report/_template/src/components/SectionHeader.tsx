import { ReactNode } from "react";

export default function SectionHeader({
  eyebrow,
  title,
  subtitle,
  right,
}: {
  eyebrow?: string;
  title: string;
  subtitle?: string | ReactNode;
  right?: ReactNode;
}) {
  return (
    <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div>
        {eyebrow ? (
          <div className="text-[11px] uppercase tracking-[0.28em] text-[color:var(--sage-deep)] font-semibold mb-3">
            {eyebrow}
          </div>
        ) : null}
        <h2 className="serif text-3xl sm:text-4xl font-semibold tracking-tight text-[color:var(--text-primary)] leading-tight">
          {title}
        </h2>
        {subtitle ? (
          <p className="mt-3 max-w-2xl text-[color:var(--text-secondary)] leading-relaxed">
            {subtitle}
          </p>
        ) : null}
      </div>
      {right ? <div>{right}</div> : null}
    </div>
  );
}
