"use client";

import {
  Area,
  Bar,
  CartesianGrid,
  ComposedChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

const data = [
  { label: "Prior 7 days\n(Apr 10–16)", spend: 5665, revenue: 8919, roas: 1.57 },
  { label: "Last 7 days\n(Apr 17–23)", spend: 5087, revenue: 17754, roas: 3.49 },
];

export default function WoWChart() {
  return (
    <div className="rounded-2xl border border-[color:var(--border)] bg-[color:var(--surface)] p-5 sm:p-6">
      <div className="flex items-end justify-between mb-2">
        <div>
          <div className="text-[11px] uppercase tracking-[0.18em] text-[color:var(--text-tertiary)] font-medium">
            Blended · week over week
          </div>
          <h3 className="serif text-2xl font-semibold mt-1 text-[color:var(--text-primary)]">
            The trend is improving
          </h3>
        </div>
      </div>

      <div className="h-[280px] w-full mt-4">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={data} margin={{ top: 20, right: 16, left: -8, bottom: 24 }}>
            <defs>
              <linearGradient id="revArea" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#4A7C59" stopOpacity={0.5} />
                <stop offset="100%" stopColor="#4A7C59" stopOpacity={0.05} />
              </linearGradient>
            </defs>
            <CartesianGrid stroke="#E5E1D8" strokeDasharray="2 6" vertical={false} />
            <XAxis
              dataKey="label"
              tick={{ fill: "#4A4A47", fontSize: 11, fontFamily: "Inter" }}
              axisLine={{ stroke: "#E5E1D8" }}
              tickLine={false}
              interval={0}
            />
            <YAxis
              tick={{ fill: "#8A8680", fontSize: 11, fontFamily: "JetBrains Mono" }}
              axisLine={false}
              tickLine={false}
              tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`}
              width={48}
            />
            <Tooltip
              cursor={{ fill: "rgba(74,124,89,0.08)" }}
              contentStyle={{
                background: "#FFFFFF",
                border: "1px solid #CFC8B9",
                borderRadius: 10,
                fontFamily: "Inter",
                fontSize: 12,
                boxShadow: "0 4px 20px rgba(0,0,0,0.06)",
              }}
              labelStyle={{ color: "#1F1F1F", fontWeight: 600 }}
              formatter={(v: number, n: string) => {
                if (n === "roas") return [`${v}x`, "ROAS"];
                return [`$${v.toLocaleString("en-US")}`, n === "spend" ? "Spend" : "Revenue"];
              }}
            />
            <Area
              type="monotone"
              dataKey="revenue"
              stroke="#4A7C59"
              strokeWidth={2.5}
              fill="url(#revArea)"
            />
            <Bar
              dataKey="spend"
              fill="#C9B896"
              radius={[6, 6, 0, 0]}
              barSize={52}
              fillOpacity={0.95}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-4 text-xs text-[color:var(--text-secondary)]">
        <LegendSwatch color="#C9B896" label="Spend" />
        <LegendSwatch color="#4A7C59" label="Revenue" />
        <span className="mono text-[color:var(--text-tertiary)]">
          Spend −10% · Revenue +99% · MER 1.57x → 3.49x
        </span>
      </div>
    </div>
  );
}

function LegendSwatch({ color, label }: { color: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-2">
      <span className="inline-block h-2.5 w-2.5 rounded-sm" style={{ background: color }} />
      {label}
    </span>
  );
}
