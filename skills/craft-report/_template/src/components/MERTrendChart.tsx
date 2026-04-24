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
import {
  blended_mtd,
  fmtROAS,
  fmtUSD,
  mer_floor,
  mer_goal,
  monthly,
  mtd_mer,
  mtd_shopify,
  trailing12_mer,
} from "@/lib/data";

const chartData = [
  ...monthly.map((m) => ({
    label: m.label,
    mer: m.mer,
    spend: m.paid_spend,
    shopify: m.shopify_net,
    partial: false,
  })),
  {
    label: "Apr '26",
    mer: mtd_mer,
    spend: blended_mtd.spend,
    shopify: mtd_shopify.net_sales,
    partial: true, // partial month — 24 of 30 days
  },
];

export default function MERTrendChart() {
  return (
    <div className="rounded-2xl border border-[color:var(--border)] bg-[color:var(--surface)] p-5 sm:p-6">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3 mb-1">
        <div>
          <div className="text-[11px] uppercase tracking-[0.18em] text-[color:var(--text-tertiary)] font-medium">
            Monthly MER · trailing 13 months
          </div>
          <h3 className="text-2xl font-semibold mt-1 text-[color:var(--text-primary)] tracking-tight">
            Shopify revenue ÷ total paid spend
          </h3>
        </div>
        <div className="flex items-center gap-4 text-xs text-[color:var(--text-secondary)]">
          <span className="inline-flex items-center gap-2">
            <span className="h-3 w-3 rounded-sm bg-[color:var(--sage)]" /> MER
          </span>
          <span className="mono text-[color:var(--text-tertiary)]">
            12-mo avg {fmtROAS(trailing12_mer)}
          </span>
        </div>
      </div>

      <div className="h-[320px] w-full mt-4">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={chartData} margin={{ top: 28, right: 16, left: -10, bottom: 0 }}>
            <defs>
              <linearGradient id="merFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#7A825F" stopOpacity={0.3} />
                <stop offset="100%" stopColor="#7A825F" stopOpacity={0.02} />
              </linearGradient>
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
                fontFamily: "Plus Jakarta Sans",
                fontSize: 12,
                boxShadow: "0 4px 20px rgba(0,0,0,0.06)",
              }}
              labelStyle={{ color: "#1F1F1F", fontWeight: 600 }}
              formatter={(v: number, n: string, p) => {
                if (n === "mer") {
                  const d = p?.payload as { spend: number; shopify: number; partial: boolean };
                  return [
                    `${v.toFixed(2)}x${d?.partial ? " (MTD · 24 of 30 days)" : ""}`,
                    "MER",
                  ];
                }
                return [v, n];
              }}
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
              dataKey="mer"
              stroke="#7A825F"
              strokeWidth={2.5}
              fill="url(#merFill)"
              dot={(props) => {
                const { cx, cy, payload } = props;
                const partial = payload?.partial;
                const underFloor = payload?.mer < mer_floor;
                return (
                  <circle
                    key={`dot-${payload.label}`}
                    cx={cx}
                    cy={cy}
                    r={partial ? 5 : 4}
                    fill={underFloor ? "#C5392B" : "#7A825F"}
                    stroke={partial ? "#1F1F1F" : "none"}
                    strokeWidth={partial ? 1 : 0}
                  />
                );
              }}
              activeDot={{ r: 6 }}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      <div className="mt-2 text-[11px] mono text-[color:var(--text-tertiary)]">
        April &apos;26 is the MTD value through Apr 24 (24 of 30 days). All other months are closed.
      </div>

      <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-3">
        <MiniStat label="Trailing 12-mo avg MER" value={fmtROAS(trailing12_mer)} accent />
        <MiniStat label="Best month" value="May '25" sub={fmtROAS(4.83)} />
        <MiniStat label="Last close (Mar '26)" value={fmtROAS(2.60)} sub="above 2.5 floor" />
        <MiniStat label="Apr MTD" value={fmtROAS(mtd_mer)} sub="below 2.5 floor" alert />
      </div>
    </div>
  );
}

function MiniStat({
  label,
  value,
  sub,
  accent,
  alert,
}: {
  label: string;
  value: string;
  sub?: string;
  accent?: boolean;
  alert?: boolean;
}) {
  return (
    <div className="rounded-xl border border-[color:var(--border)] bg-[color:var(--surface-2)] px-3 py-2.5">
      <div className="text-[10px] uppercase tracking-widest text-[color:var(--text-tertiary)]">{label}</div>
      <div
        className={`mt-0.5 font-semibold numeric ${
          alert
            ? "text-[color:var(--alert)]"
            : accent
            ? "text-[color:var(--sage-deep)]"
            : "text-[color:var(--text-primary)]"
        }`}
      >
        {value}
      </div>
      {sub ? <div className="text-xs mono text-[color:var(--text-tertiary)]">{sub}</div> : null}
    </div>
  );
}
