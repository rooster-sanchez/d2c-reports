"use client";

import {
  Area,
  CartesianGrid,
  ComposedChart,
  Line,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { daily, daily_rolling7, mer_floor, mer_goal } from "@/lib/data";

// Merge daily ROAS + rolling7
const data = daily.map((d, i) => ({
  label: d.date.slice(5),
  daily: d.blended_roas,
  rolling7: daily_rolling7[i].roas,
}));

export default function DailyTrendChart() {
  return (
    <div className="rounded-2xl border border-[color:var(--border)] bg-[color:var(--surface)] p-5 sm:p-6">
      <div className="mb-1 flex items-end justify-between">
        <div>
          <div className="text-[11px] uppercase tracking-[0.18em] text-[color:var(--text-tertiary)] font-medium">
            Blended ROAS · daily
          </div>
          <h3 className="serif text-2xl font-semibold mt-1">Is the trend up or down?</h3>
        </div>
        <div className="flex flex-wrap gap-3 text-xs text-[color:var(--text-secondary)]">
          <LegendSwatch color="var(--sand)" label="Daily ROAS" line="dotted" />
          <LegendSwatch color="var(--sage)" label="7-day rolling" />
          <LegendSwatch color="var(--text-primary)" label="Floor 2.5" line="dashed" />
          <LegendSwatch color="var(--sage-deep)" label="Goal 3.0" line="solid" />
        </div>
      </div>

      <div className="h-[340px] w-full mt-4">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={data} margin={{ top: 24, right: 16, left: -10, bottom: 0 }}>
            <defs>
              <linearGradient id="rollingFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#7A825F" stopOpacity={0.18} />
                <stop offset="100%" stopColor="#7A825F" stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <CartesianGrid stroke="#E5E1D8" strokeDasharray="2 6" vertical={false} />
            <XAxis
              dataKey="label"
              tick={{ fill: "#8A8680", fontSize: 10, fontFamily: "JetBrains Mono" }}
              axisLine={{ stroke: "#E5E1D8" }}
              tickLine={false}
              interval={1}
            />
            <YAxis
              tick={{ fill: "#8A8680", fontSize: 11, fontFamily: "JetBrains Mono" }}
              axisLine={false}
              tickLine={false}
              tickFormatter={(v) => `${v}x`}
              domain={[0, "dataMax + 0.5"]}
              width={36}
            />
            <Tooltip
              cursor={{ stroke: "#7A825F", strokeWidth: 1, strokeDasharray: "3 3" }}
              contentStyle={{
                background: "#FFFFFF",
                border: "1px solid #CFC8B9",
                borderRadius: 10,
                fontFamily: "Inter",
                fontSize: 12,
                boxShadow: "0 4px 20px rgba(0,0,0,0.06)",
              }}
              labelStyle={{ color: "#1F1F1F", fontWeight: 600 }}
              formatter={(v: number, n: string) => [
                `${v.toFixed(2)}x`,
                n === "daily" ? "Daily" : "7-day rolling",
              ]}
            />
            <ReferenceLine
              y={mer_floor}
              stroke="#1F1F1F"
              strokeDasharray="4 4"
              strokeOpacity={0.5}
              label={{ value: "Floor 2.5", position: "insideRight", fill: "#1F1F1F", fontSize: 10, fontFamily: "JetBrains Mono" }}
            />
            <ReferenceLine
              y={mer_goal}
              stroke="#5A6345"
              strokeOpacity={0.7}
              label={{ value: "Goal 3.0", position: "insideRight", fill: "#5A6345", fontSize: 10, fontFamily: "JetBrains Mono", fontWeight: 600 }}
            />
            <Area
              type="monotone"
              dataKey="rolling7"
              stroke="#7A825F"
              strokeWidth={2.5}
              fill="url(#rollingFill)"
              dot={{ r: 3, fill: "#7A825F", strokeWidth: 0 }}
            />
            <Line
              type="monotone"
              dataKey="daily"
              stroke="#C9B896"
              strokeWidth={1.5}
              strokeDasharray="2 3"
              dot={{ r: 2, fill: "#C9B896", strokeWidth: 0 }}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

function LegendSwatch({
  color,
  label,
  line,
}: {
  color: string;
  label: string;
  line?: "solid" | "dashed" | "dotted";
}) {
  return (
    <span className="inline-flex items-center gap-2">
      <span
        className="inline-block h-[2px] w-5"
        style={{
          background: `color-mix(in srgb, ${color} 100%, transparent)`,
          borderTop:
            line === "dashed"
              ? `2px dashed ${color}`
              : line === "dotted"
              ? `2px dotted ${color}`
              : `2px solid ${color}`,
        }}
      />
      {label}
    </span>
  );
}
