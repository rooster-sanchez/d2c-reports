"use client";

import { fmtNum, fmtPct, fmtROAS, fmtUSD, mer_floor, MetricBlock, pct } from "@/lib/data";

type Row = {
  label: string;
  block?: MetricBlock;
  muted?: boolean;
  placeholder?: string;
};

const roasColor = (r: number) =>
  r >= 3
    ? "text-[color:var(--success)]"
    : r >= mer_floor
    ? "text-[color:var(--sage-deep)]"
    : "text-[color:var(--alert)]";

export default function ChannelTable({ rows, base }: { rows: Row[]; base?: MetricBlock }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-[color:var(--border)] bg-[color:var(--surface)]">
      <div className="overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="text-[11px] uppercase tracking-[0.18em] text-[color:var(--text-tertiary)] border-b border-[color:var(--border)]">
              <th className="text-left px-5 py-4 font-semibold">Window</th>
              <th className="text-right px-5 py-4 font-semibold">Spend</th>
              <th className="text-right px-5 py-4 font-semibold">Revenue</th>
              <th className="text-right px-5 py-4 font-semibold">ROAS</th>
              <th className="text-right px-5 py-4 font-semibold hidden sm:table-cell">Purchases</th>
              <th className="text-right px-5 py-4 font-semibold hidden md:table-cell">CPC</th>
              <th className="text-right px-5 py-4 font-semibold hidden md:table-cell">CTR</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[color:var(--border)]">
            {rows.map((row, i) => {
              const b = row.block;
              if (!b) {
                return (
                  <tr key={i} className="text-[color:var(--text-tertiary)]">
                    <td className="px-5 py-4">
                      <div className="font-medium text-[color:var(--text-secondary)]">{row.label}</div>
                    </td>
                    <td className="px-5 py-4 text-right mono" colSpan={6}>
                      {row.placeholder ?? "—"}
                    </td>
                  </tr>
                );
              }
              const isBase = !row.muted && i === 0;
              return (
                <tr key={i} className={isBase ? "bg-[color:var(--sage-soft)]/40" : ""}>
                  <td className="px-5 py-4">
                    <div className={`${isBase ? "font-semibold" : "font-medium"} text-[color:var(--text-primary)]`}>
                      {row.label}
                    </div>
                    <div className="text-[11px] text-[color:var(--text-tertiary)] mono">{b.range}</div>
                  </td>
                  <td className="px-5 py-4 text-right mono font-medium numeric">{fmtUSD(b.spend)}</td>
                  <td className="px-5 py-4 text-right mono font-medium numeric">{fmtUSD(b.revenue)}</td>
                  <td className="px-5 py-4 text-right">
                    <div className={`mono font-semibold numeric ${roasColor(b.roas)}`}>{fmtROAS(b.roas)}</div>
                    {base && !isBase ? (
                      <div
                        className={`text-[11px] mono ${
                          b.roas >= base.roas
                            ? "text-[color:var(--success)]"
                            : "text-[color:var(--alert)]"
                        }`}
                      >
                        {b.roas >= base.roas ? "▲" : "▼"} {fmtPct(pct(b.roas, base.roas))} vs MTD
                      </div>
                    ) : null}
                  </td>
                  <td className="px-5 py-4 text-right mono hidden sm:table-cell numeric">{fmtNum(b.purchases)}</td>
                  <td className="px-5 py-4 text-right mono hidden md:table-cell numeric">${b.cpc.toFixed(2)}</td>
                  <td className="px-5 py-4 text-right mono hidden md:table-cell numeric">{b.ctr.toFixed(2)}%</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
