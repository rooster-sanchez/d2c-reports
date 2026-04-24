"use client";

import {
  blended_ly,
  blended_lm_full,
  blended_lm_samewindow,
  blended_lw,
  blended_mtd,
  blended_pw,
  fmtPct,
  fmtROAS,
  fmtUSD,
  google_ly,
  google_lm_full,
  google_lm_samewindow,
  google_lw,
  google_mtd,
  google_pw,
  mer_floor,
  mer_goal,
  meta_ly,
  meta_lm_full,
  meta_lm_samewindow,
  meta_lw,
  meta_mtd,
  meta_pw,
  pct,
} from "@/lib/data";

// One Table — transposed layout.
// Rows = metrics (per channel). Columns = windows, with April MTD as the
// leftmost base column and each comparison column flagged as same-length or
// different-length (delta-on-dollars is only meaningful for same-length windows).

type Window = {
  key: string;
  label: string;
  range: string;
  days: number;
  meta: { spend: number; revenue: number; roas: number };
  google: { spend: number; revenue: number; roas: number };
  blended: { spend: number; revenue: number; roas: number };
};

const BASE: Window = {
  key: "mtd",
  label: "April MTD",
  range: meta_mtd.range,
  days: 24,
  meta: meta_mtd,
  google: google_mtd,
  blended: blended_mtd,
};

const COMPARISONS: Window[] = [
  {
    key: "lw",
    label: "Last 7 days",
    range: meta_lw.range,
    days: 7,
    meta: meta_lw,
    google: google_lw,
    blended: blended_lw,
  },
  {
    key: "pw",
    label: "Prior 7 days",
    range: meta_pw.range,
    days: 7,
    meta: meta_pw,
    google: google_pw,
    blended: blended_pw,
  },
  {
    key: "lm24",
    label: "Last month · same 24d",
    range: meta_lm_samewindow.range,
    days: 24,
    meta: meta_lm_samewindow,
    google: google_lm_samewindow,
    blended: blended_lm_samewindow,
  },
  {
    key: "lmfull",
    label: "Last month · full March",
    range: meta_lm_full.range,
    days: 31,
    meta: meta_lm_full,
    google: google_lm_full,
    blended: blended_lm_full,
  },
  {
    key: "ly24",
    label: "Last year · same 24d",
    range: meta_ly.range,
    days: 24,
    meta: meta_ly,
    google: google_ly,
    blended: blended_ly,
  },
];

type Row = {
  key: string;
  group: "Meta" | "Google" | "Blended";
  metric: "Spend" | "Revenue" | "ROAS";
  get: (w: Window) => number;
  format: (n: number) => string;
  kind: "dollar" | "ratio";
};

const ROWS: Row[] = [
  { key: "m-spend", group: "Meta",    metric: "Spend",   kind: "dollar", get: (w) => w.meta.spend,   format: fmtUSD },
  { key: "m-rev",   group: "Meta",    metric: "Revenue", kind: "dollar", get: (w) => w.meta.revenue, format: fmtUSD },
  { key: "m-roas",  group: "Meta",    metric: "ROAS",    kind: "ratio",  get: (w) => w.meta.roas,    format: fmtROAS },
  { key: "g-spend", group: "Google",  metric: "Spend",   kind: "dollar", get: (w) => w.google.spend,   format: fmtUSD },
  { key: "g-rev",   group: "Google",  metric: "Revenue", kind: "dollar", get: (w) => w.google.revenue, format: fmtUSD },
  { key: "g-roas",  group: "Google",  metric: "ROAS",    kind: "ratio",  get: (w) => w.google.roas,    format: fmtROAS },
  { key: "b-spend", group: "Blended", metric: "Spend",   kind: "dollar", get: (w) => w.blended.spend,   format: fmtUSD },
  { key: "b-rev",   group: "Blended", metric: "Revenue", kind: "dollar", get: (w) => w.blended.revenue, format: fmtUSD },
  { key: "b-roas",  group: "Blended", metric: "ROAS",    kind: "ratio",  get: (w) => w.blended.roas,    format: fmtROAS },
];

function roasColor(r: number) {
  if (r >= mer_goal) return "text-[color:var(--success)]";
  if (r >= mer_floor) return "text-[color:var(--sage-deep)]";
  return "text-[color:var(--alert)]";
}

function deltaColor(change: number, metric: "Spend" | "Revenue" | "ROAS") {
  // For Revenue and ROAS, up is good. For Spend, neutral — we just show direction.
  if (change === 0) return "text-[color:var(--text-tertiary)]";
  if (metric === "Spend") return "text-[color:var(--text-secondary)]";
  return change > 0 ? "text-[color:var(--success)]" : "text-[color:var(--alert)]";
}

export default function OneTable() {
  return (
    <div className="overflow-hidden rounded-2xl border border-[color:var(--border)] bg-[color:var(--surface)]">
      <div className="overflow-x-auto">
        <table className="min-w-full text-sm border-separate border-spacing-0">
          <thead>
            <tr className="text-[10px] uppercase tracking-[0.18em] text-[color:var(--text-tertiary)]">
              <th className="sticky left-0 z-10 bg-[color:var(--surface)] text-left px-4 py-3 font-semibold border-b border-[color:var(--border)]" style={{ minWidth: 180 }}>
                Metric
              </th>
              <th
                className="text-right px-4 py-3 font-semibold border-b border-[color:var(--border)] bg-[color:var(--sage-soft)]/40"
                style={{ minWidth: 160 }}
              >
                <div className="text-[color:var(--sage-deep)]">{BASE.label}</div>
                <div className="mono text-[10px] normal-case tracking-normal text-[color:var(--text-tertiary)] font-medium mt-0.5">
                  {BASE.range}
                </div>
                <div className="mt-1 text-[9px] uppercase tracking-[0.14em] font-bold text-[color:var(--sage-deep)]">
                  Base
                </div>
              </th>
              {COMPARISONS.map((w) => (
                <th
                  key={w.key}
                  className="text-right px-4 py-3 font-semibold border-b border-[color:var(--border)]"
                  style={{ minWidth: 160 }}
                >
                  <div className="text-[color:var(--text-primary)]">{w.label}</div>
                  <div className="mono text-[10px] normal-case tracking-normal text-[color:var(--text-tertiary)] font-medium mt-0.5">
                    {w.range}
                  </div>
                  <div className="mt-1 text-[9px] uppercase tracking-[0.14em] text-[color:var(--text-tertiary)] font-medium">
                    Δ vs Base
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {ROWS.map((row, i) => {
              const baseVal = row.get(BASE);
              const isFirstOfGroup = i === 0 || ROWS[i - 1].group !== row.group;
              const isBlended = row.group === "Blended";
              const groupBg = isBlended ? "bg-[color:var(--surface-2)]" : "";

              return (
                <tr
                  key={row.key}
                  className={`${groupBg} ${isFirstOfGroup ? "border-t-4 border-[color:var(--border-strong)]" : ""}`}
                >
                  <td
                    className={`sticky left-0 z-10 ${isBlended ? "bg-[color:var(--surface-2)]" : "bg-[color:var(--surface)]"} px-4 py-3 border-b border-[color:var(--border)]`}
                  >
                    <div className="flex items-baseline gap-2">
                      <span
                        className={`text-[10px] uppercase tracking-[0.15em] font-semibold ${
                          row.group === "Meta"
                            ? "text-[color:var(--sage-deep)]"
                            : row.group === "Google"
                            ? "text-[color:var(--river)]"
                            : "text-[color:var(--text-primary)]"
                        }`}
                      >
                        {row.group}
                      </span>
                      <span
                        className={`${
                          isBlended ? "font-semibold" : "font-medium"
                        } text-[color:var(--text-primary)]`}
                      >
                        {row.metric}
                      </span>
                    </div>
                  </td>

                  {/* Base column */}
                  <td className="text-right px-4 py-3 border-b border-[color:var(--border)] bg-[color:var(--sage-soft)]/25">
                    <div
                      className={`mono numeric ${
                        row.metric === "ROAS"
                          ? `${roasColor(baseVal)} font-semibold`
                          : isBlended
                          ? "font-semibold text-[color:var(--text-primary)]"
                          : "font-medium text-[color:var(--text-primary)]"
                      }`}
                    >
                      {row.format(baseVal)}
                    </div>
                  </td>

                  {/* Comparison columns */}
                  {COMPARISONS.map((w) => {
                    const val = row.get(w);
                    const change = pct(val, baseVal);
                    const showDollarDelta = row.kind === "dollar" && w.days === BASE.days;
                    const showRatioDelta = row.kind === "ratio";
                    const showDelta = showDollarDelta || showRatioDelta;
                    const dColor = deltaColor(change, row.metric);

                    return (
                      <td
                        key={w.key}
                        className="text-right px-4 py-3 border-b border-[color:var(--border)]"
                      >
                        <div
                          className={`mono numeric ${
                            row.metric === "ROAS"
                              ? `${roasColor(val)} font-semibold`
                              : isBlended
                              ? "font-semibold text-[color:var(--text-primary)]"
                              : "text-[color:var(--text-primary)]"
                          }`}
                        >
                          {row.format(val)}
                        </div>
                        {showDelta ? (
                          <div className={`mono text-[10px] mt-0.5 ${dColor} font-medium`}>
                            {fmtPct(change, 0)}
                          </div>
                        ) : (
                          <div className="mono text-[10px] mt-0.5 text-[color:var(--text-tertiary)]">
                            {w.days !== BASE.days ? `${w.days}d window` : ""}
                          </div>
                        )}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <div className="px-4 py-3 text-[11px] mono text-[color:var(--text-tertiary)] bg-[color:var(--surface-2)] border-t border-[color:var(--border)]">
        ROAS shown is paid-attributed (platform-reported), which double-counts cross-platform overlap and is NOT the same as MER. Dollar deltas are only shown when the two windows span the same number of days. For ROAS, deltas are always comparable.
      </div>
    </div>
  );
}
