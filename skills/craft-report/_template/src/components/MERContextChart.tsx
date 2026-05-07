"use client";

import {
  Bar,
  CartesianGrid,
  Cell,
  ComposedChart,
  Line,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  mer_floor,
  mer_goal,
  monthly,
  mtd_label,
  mtd_mer,
  mtd_shopify,
  trailing12_mer,
} from "@/lib/data";

type Row = {
  label: string;
  revenue: number;
  mer: number;
  partial: boolean;
};

const data: Row[] = [
  ...monthly.map((m) => ({
    label: m.label,
    revenue: m.shopify_net,
    mer: m.mer,
    partial: false,
  })),
  {
    label: mtd_label,
    revenue: mtd_shopify.net_sales,
    mer: mtd_mer,
    partial: true,
  },
];

const MerDot = ({ cx, cy, payload }: { cx?: number; cy?: number; payload?: Row }) => {
  if (cx == null || cy == null || !payload) return null;
  const above = payload.mer >= mer_floor;
  const fill = above ? "#7A825F" : "#C75D4B";
  return (
    <circle cx={cx} cy={cy} r={4} fill={fill} stroke="#FFFFFF" strokeWidth={1.5} />
  );
};

export default function MERContextChart() {
  const maxClosedRevenue = Math.max(...monthly.map((m) => m.shopify_net));

  return (
    <div className="rounded-2xl border border-[color:var(--border)] bg-[color:var(--surface)] p-5 sm:p-6">
      <div className="flex flex-wrap items-end justify-between gap-3 mb-2">
        <div>
          <div className="text-[11px] uppercase tracking-[0.18em] text-[color:var(--text-tertiary)] font-medium">
            Shopify revenue · trailing 13 months
          </div>
          <h3 className="text-2xl font-semibold mt-1 text-[color:var(--text-primary)] tracking-tight">
            Revenue and MER, side by side
          </h3>
        </div>
        <div className="flex flex-wrap gap-4 text-xs text-[color:var(--text-secondary)]">
          <span className="inline-flex items-center gap-2">
            <span className="inline-block h-2.5 w-2.5 rounded-sm bg-[color:var(--sand)]" />
            Net sales
          </span>
          <span className="inline-flex items-center gap-2">
            <span className="inline-block h-0.5 w-4 bg-[color:var(--sage-deep)]" style={{ borderTop: "1.5px dashed #5A6345", background: "transparent" }} />
            MER
          </span>
          <span className="inline-flex items-center gap-2">
            <span className="inline-block h-2.5 w-2.5 rounded-sm border border-[color:var(--sage-deep)] bg-transparent" />
            MTD (partial)
          </span>
        </div>
      </div>

      <div className="h-[360px] w-full mt-4">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={data} margin={{ top: 24, right: 12, left: -12, bottom: 0 }}>
            <defs>
              <linearGradient id="mctxBarSage" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#7A825F" stopOpacity={1} />
                <stop offset="100%" stopColor="#5A6345" stopOpacity={0.85} />
              </linearGradient>
              <linearGradient id="mctxBarSand" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#C9B896" stopOpacity={0.9} />
                <stop offset="100%" stopColor="#C9B896" stopOpacity={0.5} />
              </linearGradient>
              <pattern id="mctxBarPartial" patternUnits="userSpaceOnUse" width="6" height="6" patternTransform="rotate(45)">
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
              yAxisId="rev"
              tick={{ fill: "#8A8680", fontSize: 11, fontFamily: "JetBrains Mono" }}
              axisLine={false}
              tickLine={false}
              tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`}
              width={52}
            />
            <YAxis
              yAxisId="mer"
              orientation="right"
              tick={{ fill: "#8A8680", fontSize: 11, fontFamily: "JetBrains Mono" }}
              axisLine={false}
              tickLine={false}
              tickFormatter={(v) => `${v.toFixed(1)}x`}
              width={42}
              domain={[0, (dataMax: number) => Math.max(dataMax * 1.1, mer_goal * 1.15)]}
            />
            <ReferenceLine
              yAxisId="mer"
              y={mer_floor}
              stroke="#C75D4B"
              strokeDasharray="4 4"
              strokeOpacity={0.7}
              label={{ value: `Floor ${mer_floor}x`, position: "insideRight", fill: "#C75D4B", fontSize: 10, fontFamily: "JetBrains Mono" }}
            />
            <ReferenceLine
              yAxisId="mer"
              y={mer_goal}
              stroke="#5A6345"
              strokeDasharray="4 4"
              strokeOpacity={0.7}
              label={{ value: `Goal ${mer_goal}x`, position: "insideRight", fill: "#5A6345", fontSize: 10, fontFamily: "JetBrains Mono" }}
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
              formatter={(value: number, name: string, p) => {
                const d = p?.payload as Row;
                if (name === "revenue") {
                  const suffix = d?.partial ? " (MTD)" : "";
                  return [`$${value.toLocaleString("en-US", { maximumFractionDigits: 0 })}${suffix}`, "Net sales"];
                }
                if (name === "mer") {
                  return [`${value.toFixed(2)}x`, "MER"];
                }
                return [String(value), name];
              }}
            />
            <Bar yAxisId="rev" dataKey="revenue" radius={[6, 6, 0, 0]}>
              {data.map((d, i) => {
                let fill: string;
                if (d.partial) {
                  fill = "url(#mctxBarPartial)";
                } else if (d.revenue === maxClosedRevenue) {
                  fill = "url(#mctxBarSage)";
                } else {
                  fill = "url(#mctxBarSand)";
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
            </Bar>
            <Line
              yAxisId="mer"
              type="monotone"
              dataKey="mer"
              stroke="#5A6345"
              strokeWidth={1.75}
              strokeDasharray="3 4"
              dot={<MerDot />}
              activeDot={{ r: 5, stroke: "#FFFFFF", strokeWidth: 2 }}
              isAnimationActive={false}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      <div className="mt-3 text-[11px] mono text-[color:var(--text-tertiary)]">
        Trailing 12-mo avg MER: {trailing12_mer.toFixed(2)}x · {mtd_label} reflects {mtd_shopify.range}.
      </div>
    </div>
  );
}
