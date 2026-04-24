"use client";

import { ArrowDownRight, ArrowUpRight, Minus } from "lucide-react";
import { fmtPct, pct } from "@/lib/data";

type Props = {
  now: number;
  then: number;
  label?: string;
  // For cost-type metrics (CPC, CPM, spend per order) where up = bad
  inverse?: boolean;
  currency?: boolean;
};

export default function Delta({ now, then, label, inverse, currency }: Props) {
  if (!then) {
    return (
      <span className="inline-flex items-center gap-1 text-xs mono text-[color:var(--text-tertiary)]">
        <Minus size={12} /> n/a {label ? <span>{label}</span> : null}
      </span>
    );
  }
  const change = pct(now, then);
  const positive = inverse ? change < 0 : change > 0;
  const negative = inverse ? change > 0 : change < 0;
  const color = positive
    ? "text-[color:var(--success)]"
    : negative
    ? "text-[color:var(--alert)]"
    : "text-[color:var(--text-tertiary)]";
  const Icon = change > 0 ? ArrowUpRight : change < 0 ? ArrowDownRight : Minus;

  const absChange = currency
    ? `$${Math.abs(now - then).toLocaleString("en-US", { maximumFractionDigits: 0 })}`
    : null;

  return (
    <span className={`inline-flex items-center gap-1 text-xs mono ${color}`}>
      <Icon size={12} />
      <span className="font-semibold">{fmtPct(change)}</span>
      {absChange ? <span className="text-[color:var(--text-tertiary)]">({absChange})</span> : null}
      {label ? <span className="text-[color:var(--text-tertiary)]">{label}</span> : null}
    </span>
  );
}
