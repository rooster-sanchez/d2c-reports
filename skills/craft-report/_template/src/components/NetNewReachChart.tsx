"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ComposedChart,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  Legend,
} from "recharts";
import { reach_history } from "@/lib/data";

const data = reach_history.map((r) => ({
  label: r.label,
  prev: r.prev_reached,
  net_new: r.net_new,
  total: r.monthly_reach,
  pct_new: Math.round(r.pct_new * 10) / 10,
  partial: !!r.partial,
}));

const CHART_COLORS = {
  previously: "#4A90D4",  // river-blue
  netNew: "#4FB8A4",      // teal-sage
  line: "#E59A2C",        // brand amber
};

export default function NetNewReachChart() {
  return (
    <div className="rounded-2xl border border-[color:var(--border)] bg-[color:var(--surface)] p-5 sm:p-6">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3 mb-2">
        <div>
          <div className="text-[11px] uppercase tracking-[0.18em] text-[color:var(--text-tertiary)] font-medium">
            Reach composition · monthly
          </div>
          <h3 className="text-2xl font-semibold mt-1 text-[color:var(--text-primary)] tracking-tight">
            Are we still reaching new people?
          </h3>
        </div>
        <div className="hidden sm:flex items-center gap-4 text-xs text-[color:var(--text-secondary)]">
          <LegendItem color={CHART_COLORS.previously} label="Reached previously" />
          <LegendItem color={CHART_COLORS.netNew} label="Net new reach" />
          <LegendItem color={CHART_COLORS.line} label="% Net new" line />
        </div>
      </div>

      <div className="h-[360px] w-full mt-4">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={data} margin={{ top: 24, right: 48, left: -10, bottom: 0 }}>
            <CartesianGrid stroke="#E5E1D8" strokeDasharray="2 6" vertical={false} />
            <XAxis
              dataKey="label"
              tick={{ fill: "#4A4A47", fontSize: 11, fontFamily: "Plus Jakarta Sans" }}
              axisLine={{ stroke: "#E5E1D8" }}
              tickLine={false}
            />
            <YAxis
              yAxisId="left"
              tick={{ fill: "#8A8680", fontSize: 10, fontFamily: "JetBrains Mono" }}
              axisLine={false}
              tickLine={false}
              tickFormatter={(v) => `${(v / 1000).toFixed(0)}K`}
              width={44}
              label={{ value: "Reach", angle: -90, position: "insideLeft", fill: "#8A8680", fontSize: 11, fontFamily: "Plus Jakarta Sans" }}
            />
            <YAxis
              yAxisId="right"
              orientation="right"
              tick={{ fill: "#8A8680", fontSize: 10, fontFamily: "JetBrains Mono" }}
              axisLine={false}
              tickLine={false}
              tickFormatter={(v) => `${v}%`}
              domain={[0, 100]}
              width={38}
              label={{ value: "% Net new", angle: 90, position: "insideRight", fill: "#8A8680", fontSize: 11, fontFamily: "Plus Jakarta Sans" }}
            />
            <Tooltip
              cursor={{ fill: "rgba(122,130,95,0.06)" }}
              contentStyle={{
                background: "#FFFFFF",
                border: "1px solid #CFC8B9",
                borderRadius: 10,
                fontFamily: "Plus Jakarta Sans",
                fontSize: 12,
                boxShadow: "0 4px 20px rgba(0,0,0,0.06)",
              }}
              labelStyle={{ color: "#1F1F1F", fontWeight: 600 }}
              formatter={(v: number, n: string, p) => {
                const d = p?.payload as { partial?: boolean };
                const suffix = d?.partial ? " (MTD)" : "";
                if (n === "pct_new") return [`${v.toFixed(1)}%${suffix}`, "% Net new"];
                if (n === "net_new") return [`${v.toLocaleString("en-US")}${suffix}`, "Net new reach"];
                if (n === "prev") return [`${v.toLocaleString("en-US")}${suffix}`, "Reached previously"];
                return [v, n];
              }}
            />
            <Bar
              yAxisId="left"
              dataKey="prev"
              stackId="reach"
              fill={CHART_COLORS.previously}
              radius={[0, 0, 0, 0]}
            >
              {data.map((d, i) => (
                <Cell key={i} fill={CHART_COLORS.previously} fillOpacity={d.partial ? 0.55 : 0.95} />
              ))}
            </Bar>
            <Bar
              yAxisId="left"
              dataKey="net_new"
              stackId="reach"
              fill={CHART_COLORS.netNew}
              radius={[6, 6, 0, 0]}
            >
              {data.map((d, i) => (
                <Cell
                  key={i}
                  fill={CHART_COLORS.netNew}
                  fillOpacity={d.partial ? 0.55 : 0.95}
                  stroke={d.partial ? "#5A6345" : "transparent"}
                  strokeWidth={d.partial ? 1.5 : 0}
                  strokeDasharray={d.partial ? "3 3" : undefined}
                />
              ))}
            </Bar>
            <Line
              yAxisId="right"
              type="monotone"
              dataKey="pct_new"
              stroke={CHART_COLORS.line}
              strokeWidth={2.5}
              dot={{ r: 4, fill: "#FFFFFF", stroke: CHART_COLORS.line, strokeWidth: 2 }}
              activeDot={{ r: 6 }}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 sm:hidden text-[11px] text-[color:var(--text-secondary)]">
        <LegendItem color={CHART_COLORS.previously} label="Reached previously" />
        <LegendItem color={CHART_COLORS.netNew} label="Net new reach" />
        <LegendItem color={CHART_COLORS.line} label="% Net new" line />
      </div>

      <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-3">
        <MiniStat label="Peak month (% net new)" value="Sep '25" sub="75.5% net new" />
        <MiniStat label="Biggest expansion" value="Jan '26" sub="286K new people" />
        <MiniStat label="Last closed (Mar '26)" value="51.8%" sub="net new share" />
        <MiniStat label="Apr MTD" value="41.2%" sub="lowest in 10 months" alert />
      </div>

      <div className="mt-5 rounded-xl border border-[color:var(--warning)]/30 bg-[color:var(--warning-soft)]/60 p-4 text-sm text-[color:var(--text-secondary)] leading-relaxed">
        <strong className="text-[color:var(--text-primary)]">Why this chart matters. </strong>
        A high share of <em>net new</em> reach means we&apos;re still finding fresh audience each month. A falling share means we&apos;re recycling through the same people — creative fatigue and market saturation start to compound, MER compresses, and CAC drifts up. Track your client&apos;s net-new share month over month — a drop here often precedes MER compression by 30–60 days. The fix: fresh creative angles to unlock cold audiences, not just rotation of existing ones.
      </div>
    </div>
  );
}

function LegendItem({ color, label, line }: { color: string; label: string; line?: boolean }) {
  return (
    <span className="inline-flex items-center gap-2">
      <span
        className="inline-block"
        style={
          line
            ? { width: 18, height: 2, background: color, borderRadius: 2 }
            : { width: 10, height: 10, background: color, borderRadius: 2 }
        }
      />
      {label}
    </span>
  );
}

function MiniStat({
  label,
  value,
  sub,
  alert,
}: {
  label: string;
  value: string;
  sub?: string;
  alert?: boolean;
}) {
  return (
    <div className="rounded-xl border border-[color:var(--border)] bg-[color:var(--surface-2)] px-3 py-2.5">
      <div className="text-[10px] uppercase tracking-widest text-[color:var(--text-tertiary)]">{label}</div>
      <div
        className={`mt-0.5 font-semibold ${
          alert ? "text-[color:var(--alert)]" : "text-[color:var(--text-primary)]"
        }`}
      >
        {value}
      </div>
      {sub ? <div className="text-xs mono text-[color:var(--text-tertiary)]">{sub}</div> : null}
    </div>
  );
}
