"use client";

import {
  blended_mtd,
  fmtROAS,
  fmtUSD,
  last_closed,
  mer_floor,
  mer_goal,
  mtd_mer,
  mtd_shopify,
} from "@/lib/data";

/**
 * MER gauge — April MTD (Apr 1–24).
 * MER = Shopify net sales ÷ total paid spend (Meta + Google).
 * All numbers are actual — Shopify net from operator-supplied data, paid spend from Meta + Google APIs.
 */
export default function MERGauge() {
  const current = mtd_mer;
  const max = Math.max(3.5, Math.ceil(current * 10) / 10);
  const pctOf = (v: number) => (v / max) * 100;
  const underFloor = current < mer_floor;
  const lastMER = last_closed.mer;

  return (
    <div className="rounded-2xl border border-[color:var(--border)] bg-[color:var(--surface)] p-6 sm:p-8">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3 mb-6">
        <div>
          <div className="text-[11px] uppercase tracking-[0.22em] text-[color:var(--text-tertiary)] font-medium">
            Blended MER · April 1–24
          </div>
          <div className="mt-2 flex items-baseline gap-3 flex-wrap">
            <div
              className={`text-6xl sm:text-7xl font-semibold tracking-tight numeric ${
                underFloor ? "text-[color:var(--alert)]" : "text-[color:var(--text-primary)]"
              }`}
            >
              {fmtROAS(current)}
            </div>
            <div className="flex flex-col gap-0.5 pb-2">
              <span className="text-[11px] uppercase tracking-[0.18em] text-[color:var(--text-tertiary)]">
                vs floor 2.5x
              </span>
              <span
                className={`mono text-sm font-semibold ${
                  underFloor ? "text-[color:var(--alert)]" : "text-[color:var(--success)]"
                }`}
              >
                {underFloor ? "−" : "+"}
                {Math.abs(((current - mer_floor) / mer_floor) * 100).toFixed(0)}%
              </span>
            </div>
            <div className="flex flex-col gap-0.5 pb-2">
              <span className="text-[11px] uppercase tracking-[0.18em] text-[color:var(--text-tertiary)]">
                vs goal 3.0x
              </span>
              <span className="mono text-sm font-semibold text-[color:var(--text-secondary)]">
                {current >= mer_goal ? "+" : "−"}
                {Math.abs(((current - mer_goal) / mer_goal) * 100).toFixed(0)}%
              </span>
            </div>
          </div>
        </div>
        <div
          className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-xs font-semibold uppercase tracking-[0.14em] ${
            underFloor
              ? "bg-[color:var(--alert-soft)] text-[color:var(--alert)] border border-[color:var(--alert)]/30"
              : "bg-[color:var(--success-soft)] text-[color:var(--success)] border border-[color:var(--success)]/30"
          }`}
        >
          <span className="h-2 w-2 rounded-full bg-current" />
          {underFloor ? "Below floor" : "Above floor"}
        </div>
      </div>

      <div className="relative h-8">
        <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 h-2 rounded-full bg-[color:var(--bg-deep)] border border-[color:var(--border)]" />
        <div
          className={`absolute top-1/2 -translate-y-1/2 h-2 rounded-full ${
            underFloor ? "bg-[color:var(--alert)]" : "bg-[color:var(--sage)]"
          }`}
          style={{ width: `${pctOf(current)}%` }}
        />
        {/* Floor tick — just a vertical line, no overlapping label */}
        <div
          className="absolute top-1/2 -translate-y-1/2 h-6"
          style={{
            left: `${pctOf(mer_floor)}%`,
            width: "1.5px",
            background: "var(--text-primary)",
            opacity: 0.55,
            borderStyle: "dashed",
          }}
        />
        {/* Goal tick */}
        <div
          className="absolute top-1/2 -translate-y-1/2 h-6"
          style={{
            left: `${pctOf(mer_goal)}%`,
            width: "1.5px",
            background: "var(--sage-deep)",
            opacity: 0.8,
          }}
        />
        {/* Current dot */}
        <div
          className="absolute top-1/2 -translate-y-1/2 h-5 w-5 rounded-full border-2 border-[color:var(--surface)] shadow-md"
          style={{
            left: `${pctOf(current)}%`,
            transform: "translate(-50%, -50%)",
            background: underFloor ? "var(--alert)" : "var(--sage)",
          }}
        />
      </div>

      {/* Single labeled axis — number + label stacked together, no collisions */}
      <div className="relative mt-5 h-10 text-[color:var(--text-tertiary)]">
        <AxisMark position={0} label="0x" align="left" />
        <AxisMark
          position={pctOf(mer_floor)}
          label="2.5x"
          sub="Floor"
          subColor="var(--text-primary)"
        />
        <AxisMark
          position={pctOf(mer_goal)}
          label="3.0x"
          sub="Goal"
          subColor="var(--sage-deep)"
        />
        <AxisMark position={100} label={`${max.toFixed(1)}x`} align="right" />
      </div>

      <div className="mt-10 grid gap-5 md:grid-cols-3">
        <MicroFact label="Paid spend · MTD" value={fmtUSD(blended_mtd.spend)} sub="Meta + Google" />
        <MicroFact label="Shopify net sales · MTD" value={fmtUSD(mtd_shopify.net_sales)} sub={`${mtd_shopify.orders} orders · AOV $${mtd_shopify.aov.toFixed(0)}`} accent />
        <MicroFact label="March close (reference)" value={fmtROAS(lastMER)} sub={`${fmtUSD(last_closed.shopify_net)} ÷ ${fmtUSD(last_closed.paid_spend)}`} />
      </div>

      <p className="mt-6 text-sm text-[color:var(--text-secondary)] leading-relaxed">
        April MTD blended MER is <span className="font-semibold text-[color:var(--text-primary)]">{fmtROAS(current)}</span> — below the{" "}
        <span className="mono">2.5×</span> floor and short of the <span className="mono">3.0×</span> goal. March closed at{" "}
        <span className="mono font-semibold">{fmtROAS(lastMER)}</span>, so April is tracking{" "}
        <span className="mono font-semibold text-[color:var(--alert)]">
          {((lastMER - current) / lastMER * 100).toFixed(0)}%
        </span>{" "}
        behind last month&apos;s close.
      </p>
    </div>
  );
}

function AxisMark({
  position,
  label,
  sub,
  subColor,
  align = "center",
}: {
  position: number;
  label: string;
  sub?: string;
  subColor?: string;
  align?: "left" | "center" | "right";
}) {
  const style: React.CSSProperties = { left: `${position}%` };
  const justify =
    align === "left"
      ? "items-start text-left"
      : align === "right"
      ? "items-end text-right"
      : "items-center text-center";
  if (align === "center") style.transform = "translateX(-50%)";
  if (align === "right") style.transform = "translateX(-100%)";
  return (
    <div className={`absolute top-0 flex flex-col gap-0.5 ${justify}`} style={style}>
      <span className="mono text-xs font-semibold text-[color:var(--text-primary)]">{label}</span>
      {sub ? (
        <span
          className="text-[10px] uppercase tracking-[0.18em] font-medium"
          style={{ color: subColor ?? "var(--text-tertiary)" }}
        >
          {sub}
        </span>
      ) : null}
    </div>
  );
}

function MicroFact({
  label,
  value,
  sub,
  accent,
}: {
  label: string;
  value: string;
  sub?: string;
  accent?: boolean;
}) {
  return (
    <div className="rounded-xl border border-[color:var(--border)] bg-[color:var(--surface-2)] px-4 py-3">
      <div className="text-[10px] uppercase tracking-[0.2em] text-[color:var(--text-tertiary)] font-medium">{label}</div>
      <div className={`mt-1 text-2xl font-semibold numeric tracking-tight ${accent ? "text-[color:var(--sage-deep)]" : "text-[color:var(--text-primary)]"}`}>
        {value}
      </div>
      {sub ? <div className="mt-0.5 mono text-[11px] text-[color:var(--text-tertiary)]">{sub}</div> : null}
    </div>
  );
}

