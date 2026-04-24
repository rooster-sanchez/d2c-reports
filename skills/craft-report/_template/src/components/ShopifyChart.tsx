"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  LabelList,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { mtd_shopify, shopify_history } from "@/lib/data";

const data = [
  ...shopify_history.map((m) => ({
    label: m.label,
    net: m.net_sales,
    orders: m.orders,
    partial: false,
  })),
  {
    label: "Apr '26",
    net: mtd_shopify.net_sales,
    orders: mtd_shopify.orders,
    partial: true,
  },
];

export default function ShopifyChart() {
  const maxClosed = Math.max(...shopify_history.map((m) => m.net_sales));
  return (
    <div className="rounded-2xl border border-[color:var(--border)] bg-[color:var(--surface)] p-5 sm:p-6">
      <div className="flex items-end justify-between mb-2">
        <div>
          <div className="text-[11px] uppercase tracking-[0.18em] text-[color:var(--text-tertiary)] font-medium">
            Shopify net sales · trailing 13 months
          </div>
          <h3 className="text-2xl font-semibold mt-1 text-[color:var(--text-primary)] tracking-tight">
            Storewide revenue trend
          </h3>
        </div>
        <div className="hidden sm:flex gap-4 text-xs text-[color:var(--text-secondary)]">
          <span className="inline-flex items-center gap-2">
            <span className="inline-block h-2.5 w-2.5 rounded-sm bg-[color:var(--sand)]" /> Closed month
          </span>
          <span className="inline-flex items-center gap-2">
            <span className="inline-block h-2.5 w-2.5 rounded-sm border border-[color:var(--sage-deep)] bg-transparent" /> MTD (partial)
          </span>
        </div>
      </div>

      <div className="h-[340px] w-full mt-4">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 28, right: 8, left: -16, bottom: 0 }}>
            <defs>
              <linearGradient id="barSage" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#7A825F" stopOpacity={1} />
                <stop offset="100%" stopColor="#5A6345" stopOpacity={0.85} />
              </linearGradient>
              <linearGradient id="barMuted" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#C9B896" stopOpacity={0.9} />
                <stop offset="100%" stopColor="#C9B896" stopOpacity={0.5} />
              </linearGradient>
              <pattern id="barPartial" patternUnits="userSpaceOnUse" width="6" height="6" patternTransform="rotate(45)">
                <rect width="6" height="6" fill="#FAF8F4" />
                <line x1="0" y1="0" x2="0" y2="6" stroke="#5A6345" strokeWidth="1.5" />
              </pattern>
            </defs>
            <CartesianGrid stroke="#E5E1D8" strokeDasharray="2 6" vertical={false} />
            <XAxis
              dataKey="label"
              tick={{ fill: "#4A4A47", fontSize: 11, fontFamily: "Plus Jakarta Sans" }}
              axisLine={{ stroke: "#E5E1D8" }}
              tickLine={false}
            />
            <YAxis
              tick={{ fill: "#8A8680", fontSize: 11, fontFamily: "JetBrains Mono" }}
              axisLine={false}
              tickLine={false}
              tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`}
              width={48}
            />
            <Tooltip
              cursor={{ fill: "rgba(122,130,95,0.08)" }}
              contentStyle={{
                background: "#FFFFFF",
                border: "1px solid #CFC8B9",
                borderRadius: 10,
                fontFamily: "Plus Jakarta Sans",
                fontSize: 12,
                boxShadow: "0 4px 20px rgba(0,0,0,0.06)",
              }}
              labelStyle={{ color: "#1F1F1F", fontWeight: 600 }}
              formatter={(v: number, _n: string, p) => {
                const d = p?.payload as { partial: boolean };
                const suffix = d?.partial ? " (MTD · 24 of 30 days)" : "";
                return [`$${v.toLocaleString("en-US", { maximumFractionDigits: 0 })}${suffix}`, "Net sales"];
              }}
            />
            <Bar dataKey="net" radius={[6, 6, 0, 0]}>
              {data.map((d, i) => {
                let fill: string;
                if (d.partial) {
                  fill = "url(#barPartial)";
                } else if (d.net === maxClosed) {
                  fill = "url(#barSage)";
                } else {
                  fill = "url(#barMuted)";
                }
                return (
                  <Cell
                    key={i}
                    fill={fill}
                    stroke={d.partial ? "#5A6345" : "transparent"}
                    strokeWidth={d.partial ? 1.5 : 0}
                  />
                );
              })}
              <LabelList
                dataKey="net"
                position="top"
                formatter={(v: number) => `$${(v / 1000).toFixed(0)}k`}
                style={{ fill: "#4A4A47", fontSize: 10, fontFamily: "JetBrains Mono" }}
              />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
        <Stat label="12-mo total (closed)" value="$402,214" />
        <Stat label="Best month" value="Mar '26" sub="$53.8K" />
        <Stat label="Apr MTD" value={`$${(mtd_shopify.net_sales / 1000).toFixed(1)}K`} sub={`${mtd_shopify.orders} orders · partial`} accent />
        <Stat label="AOV climb" value="$177 → $448" sub="last 12 months" />
      </div>
    </div>
  );
}

function Stat({
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
    <div className="rounded-xl border border-[color:var(--border)] bg-[color:var(--surface-2)] px-3 py-2.5">
      <div className="text-[10px] uppercase tracking-widest text-[color:var(--text-tertiary)]">
        {label}
      </div>
      <div
        className={`mt-0.5 font-semibold ${
          accent ? "text-[color:var(--sage-deep)]" : "text-[color:var(--text-primary)]"
        }`}
      >
        {value}
      </div>
      {sub ? <div className="text-xs mono text-[color:var(--text-tertiary)]">{sub}</div> : null}
    </div>
  );
}
