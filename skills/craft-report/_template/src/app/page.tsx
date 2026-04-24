import {
  blended_lm_full,
  blended_lm_samewindow,
  blended_ly,
  blended_lw,
  blended_mtd,
  blended_pw,
  first_half,
  fmtPct,
  fmtROAS,
  fmtUSD,
  google_lm_full,
  google_lm_samewindow,
  google_ly,
  google_lw,
  google_mtd,
  google_pw,
  last_closed,
  mer_floor,
  mer_goal,
  meta,
  meta_ly,
  meta_lw,
  meta_lm_full,
  meta_lm_samewindow,
  meta_mtd,
  meta_pw,
  mtd_mer,
  mtd_shopify,
  pct,
  second_half,
  shopify_history,
  trailing12_mer,
} from "@/lib/data";
import KPICard from "@/components/KPICard";
import SectionHeader from "@/components/SectionHeader";
import ChannelTable from "@/components/ChannelTable";
import ShopifyChart from "@/components/ShopifyChart";
import WoWChart from "@/components/WoWChart";
import ChannelMixChart from "@/components/ChannelMixChart";
import MERGauge from "@/components/MERGauge";
import MERTrendChart from "@/components/MERTrendChart";
import DailyTrendChart from "@/components/DailyTrendChart";
import WorkedLists from "@/components/WorkedLists";
import OneTable from "@/components/OneTable";
import NetNewReachChart from "@/components/NetNewReachChart";

export default function Page() {
  const aprilLastYear = shopify_history.find((m) => m.month === "2025-04")!;
  const march26 = shopify_history.find((m) => m.month === "2026-03")!;

  return (
    <main className="min-h-screen">
      {/* ——— HERO ——— */}
      <section className="relative overflow-hidden">
        <div className="mx-auto max-w-7xl px-6 sm:px-10 pt-12 sm:pt-16 pb-8">
          <div className="flex items-center gap-3 mb-10">
            <div className="h-9 w-9 rounded-full bg-[color:var(--sage)] flex items-center justify-center">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M2 16s3-5 10-5 10 5 10 5" />
                <path d="M2 16s3 5 10 5 10-5 10-5" />
              </svg>
            </div>
            <div className="text-sm tracking-wide text-[color:var(--text-secondary)] font-medium">
              {meta.client_name}
            </div>
            <span className="ml-auto mono text-[11px] uppercase tracking-[0.22em] text-[color:var(--text-tertiary)] border border-[color:var(--border)] rounded-full px-3 py-1.5 bg-[color:var(--surface)]">
              {meta.generated_at}
            </span>
          </div>

          <div className="max-w-4xl">
            <div className="text-[11px] uppercase tracking-[0.32em] text-[color:var(--sage-deep)] mb-4 font-semibold">
              {meta.report_title} · {meta.date_label}
            </div>
            <h1 className="text-5xl sm:text-7xl font-semibold leading-[1.02] tracking-tight text-[color:var(--text-primary)]">
              April MTD blended MER is{" "}
              <span className="text-[color:var(--alert)] numeric">{fmtROAS(mtd_mer)}</span> —
              <span className="text-[color:var(--text-tertiary)]"> under the 2.5× floor, with last week trending back above goal.</span>
            </h1>
            <p className="mt-8 text-lg text-[color:var(--text-secondary)] leading-relaxed max-w-3xl">
              Through April 24, Shopify did{" "}
              <span className="numeric font-semibold text-[color:var(--text-primary)]">{fmtUSD(mtd_shopify.net_sales)}</span> in net sales on{" "}
              <span className="numeric font-semibold text-[color:var(--text-primary)]">{fmtUSD(blended_mtd.spend)}</span> of paid spend (Meta + Google) — a blended MER of{" "}
              <span className="numeric font-semibold text-[color:var(--alert)]">{fmtROAS(mtd_mer)}</span>. For reference, March closed at{" "}
              <span className="numeric">{fmtROAS(last_closed.mer)}</span> and the trailing 12-month average is{" "}
              <span className="numeric">{fmtROAS(trailing12_mer)}</span>. The last 7 days have moved in the right direction — the question is whether we hold that pace through month-end.
            </p>
          </div>
        </div>

        <div className="mx-auto max-w-7xl px-6 sm:px-10 pb-12">
          <MERGauge />
        </div>

        <div className="mx-auto max-w-7xl px-6 sm:px-10 pb-16">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <KPICard
              label="Blended paid spend · MTD"
              value={fmtUSD(blended_mtd.spend)}
              sublabel="Meta + Google"
              accent="sand"
              deltas={[
                { now: blended_mtd.spend, then: blended_lm_samewindow.spend, label: "vs last mo", currency: true },
                { now: blended_mtd.spend, then: blended_ly.spend, label: "vs last yr", currency: true },
              ]}
            />
            <KPICard
              label="Paid-attributed revenue · MTD"
              value={fmtUSD(blended_mtd.revenue)}
              sublabel="Pixel + GA4 reported"
              accent="sage"
              deltas={[
                { now: blended_mtd.revenue, then: blended_lm_samewindow.revenue, label: "vs last mo", currency: true },
                { now: blended_mtd.revenue, then: blended_ly.revenue, label: "vs last yr", currency: true },
              ]}
            />
            <KPICard
              label="Blended MER · MTD"
              value={fmtROAS(mtd_mer)}
              sublabel={`${(((mtd_mer - mer_floor) / mer_floor) * 100).toFixed(0)}% vs 2.5 floor`}
              accent="alert"
              deltas={[
                { now: mtd_mer, then: last_closed.mer, label: "vs March close" },
                { now: mtd_mer, then: trailing12_mer, label: "vs 12-mo avg" },
              ]}
            />
            <KPICard
              label="Last 7 days · paid MER"
              value={fmtROAS(blended_lw.roas)}
              sublabel={`${fmtPct(pct(blended_lw.roas, blended_pw.roas))} vs prior week`}
              accent="sage"
              deltas={[{ now: blended_lw.roas, then: blended_pw.roas, label: "vs prior 7 days" }]}
            />
          </div>
        </div>
      </section>

      <div className="hairline mx-auto max-w-7xl" />

      {/* ——— HEADLINE TAKEAWAYS ——— */}
      <section className="mx-auto max-w-7xl px-6 sm:px-10 py-16">
        <SectionHeader
          eyebrow="Top of mind"
          title="Three things that define the month"
          subtitle="The full-month MER is the number we&apos;re accountable for. Here&apos;s where it stands and where it&apos;s headed."
        />

        <div className="grid gap-5 md:grid-cols-3">
          <TakeCard
            index="01"
            tone="alert"
            title="MER is under the 2.5 floor"
            body={
              <>
                April MTD blended MER is <strong>{fmtROAS(mtd_mer)}</strong> — a{" "}
                <strong>{((mer_floor - mtd_mer) / mer_floor * 100).toFixed(0)}%</strong> gap to floor and{" "}
                <strong>{((mer_goal - mtd_mer) / mer_goal * 100).toFixed(0)}%</strong> off the 3.0 goal. March closed at{" "}
                <strong>{fmtROAS(last_closed.mer)}</strong>; the 12-month average is{" "}
                <strong>{fmtROAS(trailing12_mer)}</strong>. Efficiency has been sliding as we&apos;ve scaled spend, and April is continuing that trend.
              </>
            }
          />
          <TakeCard
            index="02"
            tone="sage"
            title="The trend is up, fast"
            body={
              <>
                First half of April (Apr 1–12) ran paid-attributed at <strong>{fmtROAS(first_half.roas)}</strong>. Second half (Apr 13–23) lifted to{" "}
                <strong>{fmtROAS(second_half.roas)}</strong>. Last 7 days closed at{" "}
                <strong>{fmtROAS(blended_lw.roas)}</strong> — above the 3.0 goal at the paid-attributed layer. If that pace holds for 6 more days, MTD MER ends closer to 2.6–2.7x.
              </>
            }
          />
          <TakeCard
            index="03"
            tone="neutral"
            title="One ad-set is doing most of the damage"
            body={
              <>
                53% of Meta spend ($7.7K) is running through a January-build LAL stack at <strong>1.71× ROAS</strong>. It&apos;s the single largest drag on blended MER. In parallel, an Econ 101 Flex Ad launched mid-month is printing <strong>6.46× on $1.1K</strong> — the pivot is visible; it&apos;s a budget-shift question, not a strategy one.
              </>
            }
          />
        </div>
      </section>

      <div className="hairline mx-auto max-w-7xl" />

      {/* ——— DAILY TREND (Shape of the month) ——— */}
      <section className="mx-auto max-w-7xl px-6 sm:px-10 py-16">
        <SectionHeader
          eyebrow="April · daily view"
          title="The shape of the month"
          subtitle="Dotted line = daily paid-attributed ROAS. Solid sage = 7-day rolling average. Dashed horizontal is the 2.5 floor; solid one is 3.0 goal."
        />
        <DailyTrendChart />
        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <SplitCard label="First half · Apr 1–12" spend={first_half.spend} revenue={first_half.revenue} roas={first_half.roas} />
          <SplitCard label="Second half · Apr 13–23" spend={second_half.spend} revenue={second_half.revenue} roas={second_half.roas} />
        </div>
      </section>

      <div className="hairline mx-auto max-w-7xl" />

      {/* ——— NET NEW REACH ——— */}
      <section className="mx-auto max-w-7xl px-6 sm:px-10 py-16">
        <SectionHeader
          eyebrow="Audience health · Meta"
          title="Net new reach — are we still finding fresh audience?"
          subtitle="Blue = people already reached at some point since April '25. Teal = people reached for the first time that month. Amber line = share of reach that was net new. Higher is better."
        />
        <NetNewReachChart />
      </section>

      <div className="hairline mx-auto max-w-7xl" />

      {/* ——— MER TREND ——— */}
      <section className="mx-auto max-w-7xl px-6 sm:px-10 py-16">
        <SectionHeader
          eyebrow="MER in context · 13 months"
          title="How April compares to the last year"
          subtitle="MER = Shopify net sales ÷ total paid spend. Every data point is a full closed month, except April '26 which is MTD through the 24th."
        />
        <MERTrendChart />
      </section>

      <div className="hairline mx-auto max-w-7xl" />

      {/* ——— WHAT WORKED / DIDN'T ——— */}
      <section className="mx-auto max-w-7xl px-6 sm:px-10 py-16">
        <SectionHeader
          eyebrow="Inside the month"
          title="What worked. What didn&apos;t."
          subtitle="Ad-set and campaign level. This is where the floor gap is coming from — and where the climb out is coming from."
        />
        <WorkedLists />
      </section>

      <div className="hairline mx-auto max-w-7xl" />

      {/* ——— CHANNEL MIX ——— */}
      <section className="mx-auto max-w-7xl px-6 sm:px-10 py-16">
        <SectionHeader
          eyebrow="Channel mix · MTD"
          title="How Meta and Google split the work"
          subtitle="Meta handles volume (85% of spend) but is running under the 2.5 floor at the paid-attributed layer. Google handles 15% of spend at 3.19× — the efficiency anchor."
        />
        <ChannelMixChart />
      </section>

      {/* ——— META ADS ——— */}
      <section className="mx-auto max-w-7xl px-6 sm:px-10 py-16">
        <SectionHeader
          eyebrow="Channel 1 · Meta Ads"
          title="Meta Ads"
          subtitle={
            <>
              Live from the Meta Ads API for account{" "}
              <span className="mono text-xs text-[color:var(--text-tertiary)]">act_10201347022213189</span>. Revenue is pixel-attributed.
            </>
          }
        />
        <ChannelTable
          base={meta_mtd}
          rows={[
            { label: "April MTD · 2026", block: meta_mtd },
            { label: "Last month · same window", block: meta_lm_samewindow, muted: true },
            { label: "Last month · full March", block: meta_lm_full, muted: true },
            { label: "Last year · same window", block: meta_ly, muted: true },
          ]}
        />
      </section>

      {/* ——— GOOGLE ADS ——— */}
      <section className="mx-auto max-w-7xl px-6 sm:px-10 py-16">
        <SectionHeader
          eyebrow="Channel 2 · Google Ads"
          title="Google Ads"
          subtitle={
            <>
              Live from the Google Ads API, customer{" "}
              <span className="mono text-xs text-[color:var(--text-tertiary)]">144-966-8597</span> under the MMS MCC. Revenue is GA4-linked conversion value.
            </>
          }
        />
        <GoogleTable />
      </section>

      <div className="hairline mx-auto max-w-7xl" />

      {/* ——— WoW ——— */}
      <section className="mx-auto max-w-7xl px-6 sm:px-10 py-16">
        <SectionHeader
          eyebrow="Week over week"
          title="Last 7 days vs prior 7 days"
          subtitle="The back half of the month is carrying the front half. The question is whether the pace holds."
        />
        <div className="grid gap-6 lg:grid-cols-5">
          <div className="lg:col-span-3">
            <WoWChart />
          </div>
          <div className="lg:col-span-2 grid gap-4 content-start">
            <KPICard
              label="Paid MER · last 7 days"
              value={fmtROAS(blended_lw.roas)}
              sublabel={`Meta ${fmtROAS(meta_lw.roas)} · Google ${fmtROAS(google_lw.roas)}`}
              accent="sage"
              big
              deltas={[{ now: blended_lw.roas, then: blended_pw.roas, label: "vs prior 7 days" }]}
            />
            <KPICard
              label="Paid revenue · last 7 days"
              value={fmtUSD(blended_lw.revenue)}
              sublabel={`${fmtUSD(meta_lw.revenue)} Meta + ${fmtUSD(google_lw.revenue)} Google`}
              accent="sage"
              deltas={[{ now: blended_lw.revenue, then: blended_pw.revenue, label: "vs prior 7 days", currency: true }]}
            />
          </div>
        </div>
      </section>

      <div className="hairline mx-auto max-w-7xl" />

      {/* ——— SHOPIFY ——— */}
      <section className="mx-auto max-w-7xl px-6 sm:px-10 py-16">
        <SectionHeader
          eyebrow="Storewide · context"
          title="Shopify — the denominator"
          subtitle="Shopify net sales are the numerator in the MER calculation. Here&apos;s the trailing 12 months for context."
        />
        <ShopifyChart />

        <div className="mt-6 grid gap-5 md:grid-cols-3">
          <StatBlock
            title="April '25 · full month"
            value={fmtUSD(aprilLastYear.net_sales)}
            sublabel={`${aprilLastYear.orders} orders · AOV $${aprilLastYear.aov.toFixed(0)} · MER 3.89x`}
            color="neutral"
          />
          <StatBlock
            title="March '26 · full month"
            value={fmtUSD(march26.net_sales)}
            sublabel={`${march26.orders} orders · AOV $${march26.aov.toFixed(0)} · MER ${fmtROAS(last_closed.mer)}`}
            color="sage"
          />
          <StatBlock
            title="April '26 · MTD (Apr 1–24)"
            value={fmtUSD(mtd_shopify.net_sales)}
            sublabel={`${mtd_shopify.orders} orders · AOV $${mtd_shopify.aov.toFixed(0)} · MER ${fmtROAS(mtd_mer)}`}
            color="neutral"
          />
        </div>
      </section>

      <div className="hairline mx-auto max-w-7xl" />

      {/* ——— CONSOLIDATED TABLE ——— */}
      <section className="mx-auto max-w-7xl px-6 sm:px-10 py-16">
        <SectionHeader
          eyebrow="All windows · all channels"
          title="The one table"
          subtitle="April MTD is the baseline column on the left. Every other column is compared against it. ROAS shown is paid-attributed (platform-reported) — MER lives above in its own section."
        />
        <OneTable />
      </section>

      {/* ——— FOOTER ——— */}
      <footer className="border-t border-[color:var(--border)] bg-[color:var(--bg-deep)] mt-8">
        <div className="mx-auto max-w-7xl px-6 sm:px-10 py-10 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="text-sm text-[color:var(--text-secondary)]">
              Prepared for {meta.prepared_for} · {meta.prepared_by}
            </div>
            <div className="mt-1 mono text-[11px] uppercase tracking-[0.18em] text-[color:var(--text-tertiary)]">
              Data pulled {meta.generated_at} · Meta Graph API v21 · Google Ads API v23 · Shopify CSV
            </div>
          </div>
          <div className="text-sm text-[color:var(--text-tertiary)]">
            Questions? Reply to the Slack thread.
          </div>
        </div>
      </footer>
    </main>
  );
}

function TakeCard({
  index,
  tone,
  title,
  body,
}: {
  index: string;
  tone: "alert" | "sage" | "neutral";
  title: string;
  body: React.ReactNode;
}) {
  const toneMap: Record<string, string> = {
    alert: "border-[color:var(--alert)]/30 bg-[color:var(--alert-soft)]/40",
    sage: "border-[color:var(--sage)]/40 bg-[color:var(--sage-soft)]/40",
    neutral: "border-[color:var(--border)] bg-[color:var(--surface-2)]",
  };
  const indexColor: Record<string, string> = {
    alert: "text-[color:var(--alert)]",
    sage: "text-[color:var(--sage-deep)]",
    neutral: "text-[color:var(--text-tertiary)]",
  };
  return (
    <div className={`rounded-2xl border ${toneMap[tone]} p-6`}>
      <div className={`text-5xl font-semibold ${indexColor[tone]} numeric tracking-tight`}>{index}</div>
      <h3 className="mt-3 text-xl font-semibold text-[color:var(--text-primary)] leading-snug tracking-tight">
        {title}
      </h3>
      <p className="mt-3 text-sm text-[color:var(--text-secondary)] leading-relaxed">{body}</p>
    </div>
  );
}

function SplitCard({
  label,
  spend,
  revenue,
  roas,
}: {
  label: string;
  spend: number;
  revenue: number;
  roas: number;
}) {
  const aboveFloor = roas >= mer_floor;
  return (
    <div className="rounded-2xl border border-[color:var(--border)] bg-[color:var(--surface)] p-5 sm:p-6">
      <div className="text-[11px] uppercase tracking-[0.2em] text-[color:var(--text-tertiary)] font-medium">{label}</div>
      <div className="mt-2 flex items-baseline gap-3">
        <div
          className={`text-4xl font-semibold numeric ${
            aboveFloor ? "text-[color:var(--success)]" : "text-[color:var(--alert)]"
          }`}
        >
          {fmtROAS(roas)}
        </div>
        <div className="text-xs mono text-[color:var(--text-tertiary)]">
          {fmtUSD(spend)} → {fmtUSD(revenue)}
        </div>
      </div>
    </div>
  );
}

function StatBlock({
  title,
  value,
  sublabel,
  color,
}: {
  title: string;
  value: string;
  sublabel: string;
  color: "sage" | "neutral";
}) {
  const colors: Record<string, string> = {
    sage: "border-[color:var(--sage)]/30 bg-[color:var(--sage-soft)]/40",
    neutral: "border-[color:var(--border)] bg-[color:var(--surface)]",
  };
  return (
    <div className={`rounded-2xl border p-5 ${colors[color]}`}>
      <div className="text-[11px] uppercase tracking-[0.2em] text-[color:var(--text-tertiary)] font-medium">{title}</div>
      <div className="mt-2 text-3xl font-semibold numeric text-[color:var(--text-primary)] tracking-tight">{value}</div>
      <div className="mt-1 text-sm text-[color:var(--text-secondary)]">{sublabel}</div>
    </div>
  );
}

function GoogleTable() {
  const base = google_mtd;
  const rows: { label: string; b: typeof google_mtd; isBase?: boolean }[] = [
    { label: "April MTD · 2026", b: google_mtd, isBase: true },
    { label: "Last month · same window", b: google_lm_samewindow },
    { label: "Last month · full March", b: google_lm_full },
    { label: "Last year · same window", b: google_ly },
  ];
  const roasCol = (r: number) =>
    r >= mer_goal
      ? "text-[color:var(--success)]"
      : r >= mer_floor
      ? "text-[color:var(--sage-deep)]"
      : "text-[color:var(--alert)]";

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
              <th className="text-right px-5 py-4 font-semibold hidden sm:table-cell">Conv.</th>
              <th className="text-right px-5 py-4 font-semibold hidden md:table-cell">CPC</th>
              <th className="text-right px-5 py-4 font-semibold hidden md:table-cell">CTR</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[color:var(--border)]">
            {rows.map((r, i) => (
              <tr key={i} className={r.isBase ? "bg-[color:var(--sage-soft)]/40" : ""}>
                <td className="px-5 py-4">
                  <div className={`${r.isBase ? "font-semibold" : "font-medium"} text-[color:var(--text-primary)]`}>{r.label}</div>
                  <div className="text-[11px] mono text-[color:var(--text-tertiary)]">{r.b.range}</div>
                </td>
                <td className="px-5 py-4 text-right mono font-medium numeric">{fmtUSD(r.b.spend)}</td>
                <td className="px-5 py-4 text-right mono font-medium numeric">{fmtUSD(r.b.revenue)}</td>
                <td className="px-5 py-4 text-right">
                  <div className={`mono font-semibold numeric ${roasCol(r.b.roas)}`}>
                    {fmtROAS(r.b.roas)}
                  </div>
                  {!r.isBase ? (
                    <div
                      className={`text-[11px] mono ${
                        r.b.roas >= base.roas ? "text-[color:var(--success)]" : "text-[color:var(--alert)]"
                      }`}
                    >
                      {r.b.roas >= base.roas ? "▲" : "▼"} {fmtPct(pct(r.b.roas, base.roas))} vs MTD
                    </div>
                  ) : null}
                </td>
                <td className="px-5 py-4 text-right mono hidden sm:table-cell numeric">{r.b.conversions.toFixed(0)}</td>
                <td className="px-5 py-4 text-right mono hidden md:table-cell numeric">${r.b.cpc.toFixed(2)}</td>
                <td className="px-5 py-4 text-right mono hidden md:table-cell numeric">{r.b.ctr.toFixed(2)}%</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
