import Image from "next/image";
import {
  meta as reportMeta,
  top_performers,
  fmtUSD,
  fmtROAS,
  mer_floor,
  mer_goal,
  type TopPerformer,
} from "@/lib/data";

const AS_OF_ISO = reportMeta.as_of ?? new Date().toISOString().slice(0, 10);

function roasTone(roas: number): { text: string; dot: string } {
  if (roas >= mer_goal) {
    return { text: "text-[color:var(--success)]", dot: "bg-[color:var(--success)]" };
  }
  if (roas >= mer_floor) {
    return { text: "text-[color:var(--sage-deep)]", dot: "bg-[color:var(--sage-deep)]" };
  }
  return { text: "text-[color:var(--alert)]", dot: "bg-[color:var(--alert)]" };
}

function fmtLaunchShort(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "2-digit" });
}

function daysLive(iso: string, asOfIso: string): number {
  const d = new Date(iso).getTime();
  const now = new Date(`${asOfIso}T00:00:00Z`).getTime();
  return Math.max(1, Math.round((now - d) / (1000 * 60 * 60 * 24)));
}

// Falls back to --river when --olive isn't defined for the brand palette.
const badgeStyles: Record<TopPerformer["formatBadge"], string> = {
  "Flex Ad": "bg-[color:var(--sage-deep)] text-white",
  Static: "bg-[color:var(--river)] text-white",
  Video: "bg-[color:var(--olive,var(--river))] text-white",
  Dynamic: "bg-[color:var(--sand)] text-[color:var(--text-primary)]",
};

function AdCard({ p }: { p: TopPerformer }) {
  const tone = roasTone(p.roas);
  const live = daysLive(p.launchDate, AS_OF_ISO);
  return (
    <div className="group relative overflow-hidden rounded-2xl border border-[color:var(--border)] bg-[color:var(--surface)] transition-shadow hover:shadow-[0_18px_50px_-22px_rgba(31,31,31,0.18)]">
      {/* IMAGE */}
      <div className="relative aspect-square overflow-hidden bg-[color:var(--surface-2)]">
        <Image
          src={p.imageSrc}
          alt={p.label}
          fill
          sizes="(min-width: 1024px) 25vw, (min-width: 640px) 50vw, 100vw"
          className="object-cover transition-transform duration-[800ms] ease-out group-hover:scale-[1.03]"
          priority={p.rank <= 2}
        />
        {/* Top-right: format badge */}
        <div
          className={`absolute top-3 right-3 rounded-full px-2.5 py-1 text-[10px] uppercase tracking-[0.18em] font-semibold shadow-[0_2px_10px_rgba(0,0,0,0.10)] ${badgeStyles[p.formatBadge]}`}
        >
          {p.formatBadge}
        </div>
        {/* Bottom-left: ROAS dot indicator */}
        <div className="absolute bottom-3 left-3 flex items-center gap-1.5 rounded-full bg-white/95 backdrop-blur px-2.5 py-1 shadow-[0_2px_10px_rgba(0,0,0,0.08)]">
          <span className={`h-1.5 w-1.5 rounded-full ${tone.dot}`} />
          <span className={`mono text-[11px] font-semibold numeric ${tone.text}`}>
            {fmtROAS(p.roas)}
          </span>
        </div>
      </div>

      {/* BODY */}
      <div className="p-5">
        <h3 className="text-base font-semibold text-[color:var(--text-primary)] leading-snug tracking-tight">
          {p.label}
        </h3>
        <div className="mt-1 text-[12px] text-[color:var(--text-tertiary)] flex items-center gap-2 flex-wrap">
          <span>Launched {fmtLaunchShort(p.launchDate)}</span>
          <span className="text-[color:var(--border-strong)]">·</span>
          <span>{live} days live</span>
        </div>

        {/* KPI ROW */}
        <div className="mt-4 grid grid-cols-2 divide-x divide-[color:var(--border)] border-y border-[color:var(--border)] -mx-5 px-0">
          <Metric label="Spend" value={fmtUSD(p.spend)} />
          <Metric
            label="ROAS"
            value={fmtROAS(p.roas)}
            valueClass={tone.text}
          />
        </div>

        {/* RAW NAME */}
        <div className="mt-3 mono text-[10px] uppercase tracking-[0.12em] text-[color:var(--text-tertiary)] truncate" title={p.rawAdName}>
          {p.rawAdName}
        </div>
      </div>
    </div>
  );
}

function Metric({
  label,
  value,
  valueClass = "text-[color:var(--text-primary)]",
  sublabel,
}: {
  label: string;
  value: string;
  valueClass?: string;
  sublabel?: string;
}) {
  return (
    <div className="px-4 py-3 text-center first:pl-5 last:pr-5">
      <div className="text-[10px] uppercase tracking-[0.18em] text-[color:var(--text-tertiary)] font-semibold">
        {label}
      </div>
      <div className={`mt-1 mono text-base font-semibold numeric ${valueClass}`}>{value}</div>
      {sublabel ? (
        <div className="mt-0.5 text-[10px] text-[color:var(--text-tertiary)]">{sublabel}</div>
      ) : null}
    </div>
  );
}

export default function TopPerformers() {
  return (
    <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
      {top_performers.slice(0, 4).map((p) => (
        <AdCard key={p.adId} p={p} />
      ))}
    </div>
  );
}
