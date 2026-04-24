"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  LabelList,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { mer_floor, mer_goal } from "@/lib/data";

const META = "#7A825F";     // sage
const GOOGLE = "#3E6B73";   // river
const BLEND = "#5A6345";    // sage-deep

const spendShare = [
  { name: "Meta", value: 14592, color: META },
  { name: "Google", value: 2482, color: GOOGLE },
];
const revenueShare = [
  { name: "Meta", value: 28651, color: META },
  { name: "Google", value: 7918, color: GOOGLE },
];
const roasData = [
  { channel: "Meta", roas: 1.96 },
  { channel: "Google", roas: 3.19 },
  { channel: "Blended", roas: 2.14 },
];

export default function ChannelMixChart() {
  return (
    <div className="grid gap-5 lg:grid-cols-3">
      <SharePanel title="Spend mix" subtitle="Where the money went" data={spendShare} totalLabel="MTD spend" />
      <SharePanel title="Revenue mix" subtitle="Where the money came from" data={revenueShare} totalLabel="MTD revenue" />
      <RoasPanel />
    </div>
  );
}

function SharePanel({
  title,
  subtitle,
  data,
  totalLabel,
}: {
  title: string;
  subtitle: string;
  data: { name: string; value: number; color: string }[];
  totalLabel: string;
}) {
  const total = data.reduce((s, d) => s + d.value, 0);
  return (
    <div className="rounded-2xl border border-[color:var(--border)] bg-[color:var(--surface)] p-5">
      <div className="text-[10px] uppercase tracking-[0.18em] text-[color:var(--text-tertiary)] font-medium">
        {subtitle}
      </div>
      <h4 className="serif text-lg font-semibold text-[color:var(--text-primary)]">{title}</h4>

      <div className="mt-4 h-10 w-full flex overflow-hidden rounded-full border border-[color:var(--border)]">
        {data.map((d, i) => {
          const share = (d.value / total) * 100;
          return (
            <div
              key={i}
              className="relative flex items-center justify-center text-[11px] font-semibold text-white transition-all"
              style={{ width: `${share}%`, background: d.color }}
            >
              {share > 12 ? `${share.toFixed(0)}%` : null}
            </div>
          );
        })}
      </div>

      <div className="mt-3 space-y-2">
        {data.map((d, i) => (
          <div key={i} className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-sm" style={{ background: d.color }} />
              <span className="text-[color:var(--text-primary)] font-medium">{d.name}</span>
            </div>
            <div className="mono text-[color:var(--text-secondary)] numeric">
              ${d.value.toLocaleString("en-US", { maximumFractionDigits: 0 })}
              <span className="text-[color:var(--text-tertiary)] ml-1">
                ({((d.value / total) * 100).toFixed(0)}%)
              </span>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-4 pt-3 border-t border-[color:var(--border)] flex items-center justify-between">
        <span className="text-[11px] uppercase tracking-[0.18em] text-[color:var(--text-tertiary)]">
          {totalLabel}
        </span>
        <span className="mono font-semibold numeric text-[color:var(--text-primary)]">
          ${total.toLocaleString("en-US", { maximumFractionDigits: 0 })}
        </span>
      </div>
    </div>
  );
}

function RoasPanel() {
  return (
    <div className="rounded-2xl border border-[color:var(--border)] bg-[color:var(--surface)] p-5">
      <div className="text-[10px] uppercase tracking-[0.18em] text-[color:var(--text-tertiary)] font-medium">
        Efficiency by channel
      </div>
      <h4 className="serif text-lg font-semibold text-[color:var(--text-primary)]">ROAS vs target</h4>
      <div className="h-[208px] w-full mt-2">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={roasData} margin={{ top: 20, right: 8, left: -18, bottom: 0 }}>
            <CartesianGrid stroke="#E5E1D8" strokeDasharray="2 6" vertical={false} />
            <XAxis
              dataKey="channel"
              tick={{ fill: "#4A4A47", fontSize: 11, fontFamily: "Inter" }}
              axisLine={{ stroke: "#E5E1D8" }}
              tickLine={false}
            />
            <YAxis
              tick={{ fill: "#8A8680", fontSize: 10, fontFamily: "JetBrains Mono" }}
              axisLine={false}
              tickLine={false}
              tickFormatter={(v) => `${v}x`}
              width={36}
              domain={[0, 4]}
            />
            <Tooltip
              cursor={{ fill: "rgba(122,130,95,0.08)" }}
              contentStyle={{
                background: "#FFFFFF",
                border: "1px solid #CFC8B9",
                borderRadius: 10,
                fontFamily: "Inter",
                fontSize: 12,
              }}
              labelStyle={{ color: "#1F1F1F", fontWeight: 600 }}
              formatter={(v: number) => [`${v.toFixed(2)}x`, "ROAS"]}
            />
            <ReferenceLine
              y={mer_floor}
              stroke="#1F1F1F"
              strokeDasharray="4 4"
              strokeOpacity={0.5}
            />
            <ReferenceLine y={mer_goal} stroke="#5A6345" strokeOpacity={0.7} />
            <Bar dataKey="roas" radius={[8, 8, 0, 0]} barSize={48}>
              {roasData.map((d, i) => {
                const color = d.roas >= mer_floor ? (d.channel === "Meta" ? META : d.channel === "Google" ? GOOGLE : BLEND) : "#C5392B";
                return <Cell key={i} fill={color} />;
              })}
              <LabelList
                dataKey="roas"
                position="top"
                formatter={(v: number) => `${v.toFixed(2)}x`}
                style={{ fill: "#1F1F1F", fontSize: 11, fontFamily: "JetBrains Mono", fontWeight: 600 }}
              />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
      <div className="mt-2 flex justify-between text-[10px] mono text-[color:var(--text-tertiary)] uppercase tracking-wider">
        <span>Dashed = 2.5 floor</span>
        <span>Solid = 3.0 goal</span>
      </div>
    </div>
  );
}
