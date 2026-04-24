// Template reference data — this file is completely overwritten by
// scripts/scaffold_report.py at report generation time. The values below are
// synthetic examples so the _template/ directory builds standalone (useful
// for iterating on UI before running a real report).
//
// MER methodology used in the real generated file:
//   MER = Shopify net sales ÷ total paid spend (Meta + Google).
//   Monthly MER uses closed-month Shopify directly.
//   Current-month MTD MER uses the operator-provided Shopify MTD snapshot,
//   or falls back to a ratio-based estimate if not provided.

export const meta = {
  client_name: "Example Client",
  report_title: "April MTD Report",
  date_label: "April 1 – April 24, 2026",
  generated_at: "April 24, 2026",
  prepared_for: "Client",
  prepared_by: "Your Agency",
};

export const mer_floor = 2.5;
export const mer_goal = 3.0;

// ——— Meta Ads — per-window aggregates ———
export type MetricBlock = {
  label: string; range: string;
  spend: number; revenue: number; roas: number;
  purchases: number; clicks: number; impressions: number; reach: number;
  cpc: number; cpm: number; ctr: number;
};

export const meta_mtd: MetricBlock = {
  label: "Apr MTD", range: "Apr 1 – Apr 24, 2026",
  spend: 14000, revenue: 28000, roas: 2.00,
  purchases: 65, clicks: 15000, impressions: 800000, reach: 220000,
  cpc: 0.70, cpm: 17.50, ctr: 2.50,
};
export const meta_lm_samewindow: MetricBlock = {
  label: "Last month (same window)", range: "Mar 1 – Mar 24, 2026",
  spend: 13500, revenue: 25500, roas: 1.89,
  purchases: 57, clicks: 14900, impressions: 920000, reach: 260000,
  cpc: 0.67, cpm: 14.86, ctr: 2.22,
};
export const meta_lm_full: MetricBlock = {
  label: "Last month (full)", range: "March 2026",
  spend: 17000, revenue: 36000, roas: 2.12,
  purchases: 75, clicks: 18400, impressions: 1100000, reach: 305000,
  cpc: 0.67, cpm: 15.00, ctr: 2.24,
};
export const meta_ly: MetricBlock = {
  label: "Last year (same window)", range: "Apr 1 – Apr 24, 2025",
  spend: 4500, revenue: 9000, roas: 2.00,
  purchases: 53, clicks: 7000, impressions: 365000, reach: 90000,
  cpc: 0.47, cpm: 12.00, ctr: 2.60,
};
export const meta_lw: MetricBlock = {
  label: "Last 7 days", range: "Apr 17 – Apr 23, 2026",
  spend: 4200, revenue: 14500, roas: 3.45,
  purchases: 27, clicks: 4300, impressions: 210000, reach: 68000,
  cpc: 0.72, cpm: 19.89, ctr: 2.75,
};
export const meta_pw: MetricBlock = {
  label: "Prior 7 days", range: "Apr 10 – Apr 16, 2026",
  spend: 5000, revenue: 6800, roas: 1.36,
  purchases: 17, clicks: 4900, impressions: 270000, reach: 99000,
  cpc: 0.74, cpm: 18.72, ctr: 2.53,
};

// ——— Google Ads — per-window aggregates ———
export type GoogleBlock = {
  label: string; range: string;
  spend: number; revenue: number; roas: number;
  conversions: number; clicks: number; impressions: number;
  cpc: number; ctr: number;
};

export const google_mtd: GoogleBlock = {
  label: "Apr MTD", range: "Apr 1 – Apr 24, 2026",
  spend: 2500, revenue: 8000, roas: 3.20,
  conversions: 18, clicks: 2000, impressions: 135000, cpc: 1.21, ctr: 1.50,
};
export const google_lm_samewindow: GoogleBlock = {
  label: "Last month (same window)", range: "Mar 1 – Mar 24, 2026",
  spend: 3000, revenue: 12000, roas: 4.00,
  conversions: 25, clicks: 2100, impressions: 200000, cpc: 1.40, ctr: 1.07,
};
export const google_lm_full: GoogleBlock = {
  label: "Last month (full)", range: "March 2026",
  spend: 3700, revenue: 12500, roas: 3.38,
  conversions: 29, clicks: 2600, impressions: 225000, cpc: 1.43, ctr: 1.14,
};
export const google_ly: GoogleBlock = {
  label: "Last year (same window)", range: "Apr 1 – Apr 24, 2025",
  spend: 2300, revenue: 8000, roas: 3.50,
  conversions: 35, clicks: 2300, impressions: 300000, cpc: 0.98, ctr: 0.78,
};
export const google_lw: GoogleBlock = {
  label: "Last 7 days", range: "Apr 17 – Apr 23, 2026",
  spend: 900, revenue: 3200, roas: 3.57,
  conversions: 7, clicks: 790, impressions: 57000, cpc: 1.13, ctr: 1.38,
};
export const google_pw: GoogleBlock = {
  label: "Prior 7 days", range: "Apr 10 – Apr 16, 2026",
  spend: 600, revenue: 2100, roas: 3.58,
  conversions: 6, clicks: 560, impressions: 30000, cpc: 1.05, ctr: 1.88,
};

// ——— Blended (Meta + Google, paid-attributed) ———
export type BlendedBlock = { label: string; range: string; spend: number; revenue: number; roas: number };
function blend(m: MetricBlock, g: GoogleBlock, label: string, range: string): BlendedBlock {
  const spend = m.spend + g.spend;
  const revenue = m.revenue + g.revenue;
  return { label, range, spend, revenue, roas: spend ? revenue / spend : 0 };
}
export const blended_mtd            = blend(meta_mtd,            google_mtd,            "MTD",                     meta_mtd.range);
export const blended_lm_samewindow  = blend(meta_lm_samewindow,  google_lm_samewindow,  "Last month (same window)", meta_lm_samewindow.range);
export const blended_lm_full        = blend(meta_lm_full,        google_lm_full,        "Last month (full)",        meta_lm_full.range);
export const blended_ly             = blend(meta_ly,             google_ly,             "Last year (same window)",  meta_ly.range);
export const blended_lw             = blend(meta_lw,             google_lw,             "Last 7 days",              meta_lw.range);
export const blended_pw             = blend(meta_pw,             google_pw,             "Prior 7 days",             meta_pw.range);

// ——— Monthly MER (full closed months) ———
export type MonthlyMER = {
  month: string; label: string;
  meta_spend: number; google_spend: number;
  paid_spend: number; paid_attributed_revenue: number;
  shopify_net: number; orders: number; aov: number;
  mer: number;
};
export const monthly: MonthlyMER[] = [
  { month: "2025-04", label: "Apr '25", meta_spend: 5400,  google_spend: 3200, paid_spend: 8600,  paid_attributed_revenue: 27000, shopify_net: 33000, orders: 188, aov: 177, mer: 3.84 },
  { month: "2025-05", label: "May '25", meta_spend: 5800,  google_spend: 3700, paid_spend: 9500,  paid_attributed_revenue: 35000, shopify_net: 46000, orders: 198, aov: 232, mer: 4.84 },
  { month: "2025-06", label: "Jun '25", meta_spend: 4500,  google_spend: 2700, paid_spend: 7200,  paid_attributed_revenue: 14200, shopify_net: 26000, orders: 122, aov: 214, mer: 3.61 },
  { month: "2025-07", label: "Jul '25", meta_spend: 4700,  google_spend: 2100, paid_spend: 6800,  paid_attributed_revenue: 13000, shopify_net: 21500, orders:  96, aov: 224, mer: 3.16 },
  { month: "2025-08", label: "Aug '25", meta_spend: 5200,  google_spend: 2200, paid_spend: 7400,  paid_attributed_revenue: 15100, shopify_net: 21700, orders:  78, aov: 278, mer: 2.93 },
  { month: "2025-09", label: "Sep '25", meta_spend: 4500,  google_spend: 1000, paid_spend: 5500,  paid_attributed_revenue: 10500, shopify_net: 14500, orders:  74, aov: 196, mer: 2.64 },
  { month: "2025-10", label: "Oct '25", meta_spend: 5000,  google_spend: 1600, paid_spend: 6600,  paid_attributed_revenue: 17200, shopify_net: 23200, orders:  89, aov: 260, mer: 3.52 },
  { month: "2025-11", label: "Nov '25", meta_spend: 8800,  google_spend: 2100, paid_spend: 10900, paid_attributed_revenue: 36000, shopify_net: 46000, orders: 149, aov: 311, mer: 4.22 },
  { month: "2025-12", label: "Dec '25", meta_spend: 5500,  google_spend: 5600, paid_spend: 11100, paid_attributed_revenue: 30000, shopify_net: 33600, orders: 123, aov: 273, mer: 3.03 },
  { month: "2026-01", label: "Jan '26", meta_spend: 6400,  google_spend: 3500, paid_spend: 9900,  paid_attributed_revenue: 29000, shopify_net: 29300, orders:  82, aov: 358, mer: 2.96 },
  { month: "2026-02", label: "Feb '26", meta_spend: 11000, google_spend: 5700, paid_spend: 16700, paid_attributed_revenue: 46000, shopify_net: 52800, orders: 163, aov: 324, mer: 3.16 },
  { month: "2026-03", label: "Mar '26", meta_spend: 17000, google_spend: 3700, paid_spend: 20700, paid_attributed_revenue: 48800, shopify_net: 53700, orders: 120, aov: 448, mer: 2.59 },
];

export const trailing12_paid_spend = monthly.reduce((s, m) => s + m.paid_spend, 0);
export const trailing12_shopify    = monthly.reduce((s, m) => s + m.shopify_net, 0);
export const trailing12_mer        = trailing12_paid_spend ? trailing12_shopify / trailing12_paid_spend : 0;
export const last_closed = monthly[monthly.length - 1];

// ——— Shopify MTD + history ———
export const mtd_shopify = {
  range: "Apr 1 – Apr 24, 2026",
  orders: 93,
  net_sales: 38000,
  aov: 428,
  estimated: false,
};
export const mtd_mer = mtd_shopify.net_sales / blended_mtd.spend;
export const mtd_paid_share = blended_mtd.revenue / mtd_shopify.net_sales;
export const mtd_shopify_estimate = mtd_shopify.net_sales;
export const mtd_mer_estimate = mtd_mer;

export type ShopifyMonth = { month: string; label: string; orders: number; net_sales: number; aov: number };
export const shopify_history: ShopifyMonth[] = monthly.map((m) => ({
  month: m.month, label: m.label, orders: m.orders, net_sales: m.shopify_net, aov: m.aov,
}));

export const shopify_mtd_note =
  "This is synthetic example data in the template. When the skill scaffolds a real report, Shopify net sales come from the operator-supplied CSV / MTD snapshot.";

// ——— Daily trend (synthetic) ———
export type DailyPoint = {
  date: string; day: number;
  meta_spend: number; meta_revenue: number;
  google_spend: number; google_revenue: number;
  blended_spend: number; blended_revenue: number;
  blended_roas: number;
};

function mkDay(day: number, m_s: number, m_r: number, g_s: number, g_r: number): DailyPoint {
  const s = m_s + g_s; const r = m_r + g_r;
  return {
    date: `2026-04-${String(day).padStart(2,"0")}`, day,
    meta_spend: m_s, meta_revenue: m_r, google_spend: g_s, google_revenue: g_r,
    blended_spend: s, blended_revenue: r, blended_roas: s ? r/s : 0,
  };
}
export const daily: DailyPoint[] = [
  mkDay( 1, 600,    0, 100,    0), mkDay( 2, 560, 1300, 100,    0),
  mkDay( 3, 530,  860, 110,    0), mkDay( 4, 580, 1470, 100, 1500),
  mkDay( 5, 690, 1230, 200, 1100), mkDay( 6, 610, 1130, 130,    0),
  mkDay( 7, 600,  960,  60,    0), mkDay( 8, 580,  250,  80,    0),
  mkDay( 9, 550,   70, 120,    0), mkDay(10, 680, 1020,  50,    0),
  mkDay(11, 710,  730, 110,  300), mkDay(12, 890, 1200, 140,   40),
  mkDay(13, 880, 1300,  60,  300), mkDay(14, 680,  200,  90,    0),
  mkDay(15, 630, 1550,  90, 1450), mkDay(16, 600,  820,  50,    0),
  mkDay(17, 610, 3200, 100, 2760), mkDay(18, 450, 1300, 110,    0),
  mkDay(19, 650,  320, 150,  400), mkDay(20, 560, 5000, 130,    0),
  mkDay(21, 600,  770, 140,    0), mkDay(22, 650, 2590,  70,    0),
  mkDay(23, 680, 1400, 180,    0),
];

export const daily_rolling7 = daily.map((_, idx, arr) => {
  const start = Math.max(0, idx - 6);
  const slice = arr.slice(start, idx + 1);
  const s = slice.reduce((x, p) => x + p.blended_spend, 0);
  const r = slice.reduce((x, p) => x + p.blended_revenue, 0);
  return { date: arr[idx].date, day: arr[idx].day, roas: s ? r/s : 0 };
});

const _half1 = daily.slice(0, 12);
const _half2 = daily.slice(12);
function _agg(rows: DailyPoint[]) {
  const s = rows.reduce((x, p) => x + p.blended_spend, 0);
  const r = rows.reduce((x, p) => x + p.blended_revenue, 0);
  return { spend: s, revenue: r, roas: s ? r/s : 0 };
}
export const first_half  = { ..._agg(_half1), label: "First half · Apr 1–12" };
export const second_half = { ..._agg(_half2), label: "Second half · Apr 13–23" };

// ——— Net new reach (synthetic) ———
export type ReachMonth = {
  label: string; month: string;
  monthly_reach: number; cum_reach: number;
  net_new: number; prev_reached: number;
  pct_new: number; partial?: boolean;
};
export const reach_history: ReachMonth[] = [
  { label: "Apr '25", month: "2025-04", monthly_reach: 102000, cum_reach: 102000,  net_new: 102000, prev_reached: 0,       pct_new: 100.0 },
  { label: "May '25", month: "2025-05", monthly_reach: 109000, cum_reach: 166000,  net_new:  64000, prev_reached: 45000,   pct_new:  58.0 },
  { label: "Jun '25", month: "2025-06", monthly_reach:  79000, cum_reach: 199000,  net_new:  33000, prev_reached: 46000,   pct_new:  42.0 },
  { label: "Jul '25", month: "2025-07", monthly_reach:  64000, cum_reach: 225000,  net_new:  25000, prev_reached: 39000,   pct_new:  39.0 },
  { label: "Aug '25", month: "2025-08", monthly_reach:  60000, cum_reach: 256000,  net_new:  32000, prev_reached: 28000,   pct_new:  53.0 },
  { label: "Sep '25", month: "2025-09", monthly_reach: 165000, cum_reach: 381000,  net_new: 125000, prev_reached: 40000,   pct_new:  75.0 },
  { label: "Oct '25", month: "2025-10", monthly_reach: 144000, cum_reach: 481000,  net_new: 100000, prev_reached: 44000,   pct_new:  70.0 },
  { label: "Nov '25", month: "2025-11", monthly_reach: 291000, cum_reach: 680000,  net_new: 199000, prev_reached: 92000,   pct_new:  68.0 },
  { label: "Dec '25", month: "2025-12", monthly_reach: 205000, cum_reach: 803000,  net_new: 123000, prev_reached: 82000,   pct_new:  60.0 },
  { label: "Jan '26", month: "2026-01", monthly_reach: 398000, cum_reach: 1089000, net_new: 286000, prev_reached: 112000,  pct_new:  72.0 },
  { label: "Feb '26", month: "2026-02", monthly_reach: 379000, cum_reach: 1321000, net_new: 233000, prev_reached: 146000,  pct_new:  61.5 },
  { label: "Mar '26", month: "2026-03", monthly_reach: 308000, cum_reach: 1481000, net_new: 160000, prev_reached: 148000,  pct_new:  52.0 },
  { label: "Apr '26", month: "2026-04", monthly_reach: 223000, cum_reach: 1573000, net_new:  92000, prev_reached: 131000,  pct_new:  41.0, partial: true },
];

// ——— What worked / didn't (examples) ———
export type WorkItem = { channel: "Meta" | "Google"; name: string; friendly: string; spend: number; revenue: number; roas: number; purchases?: number; note: string };
export const worked: WorkItem[] = [
  { channel: "Meta", name: "example-winning-adset", friendly: "Example Winning Ad-set",
    spend: 1100, revenue: 7000, roas: 6.4, purchases: 14,
    note: "Replace this with a real ad-set note. Lead with what the ad-set is, why it worked, and what's next." },
  { channel: "Google", name: "MMS | Shopping | tROAS", friendly: "Google Shopping",
    spend: 600, revenue: 2300, roas: 3.8,
    note: "Intent-rich search traffic converting well — safe to raise the daily cap." },
];
export const didnt_work: WorkItem[] = [
  { channel: "Meta", name: "example-workhorse-stale", friendly: "Stale workhorse ad-set",
    spend: 7600, revenue: 13000, roas: 1.7, purchases: 31,
    note: "Half of Meta spend is going here at 1.7× ROAS. Audience fatigue — needs refresh or reduction." },
];

// ——— Helpers ———
export function pct(now: number, then: number): number { if (!then) return 0; return ((now - then) / then) * 100; }
export function fmtUSD(n: number, opts: { decimals?: number } = {}): string {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD",
    minimumFractionDigits: opts.decimals ?? 0, maximumFractionDigits: opts.decimals ?? 0 }).format(n);
}
export function fmtNum(n: number): string { return new Intl.NumberFormat("en-US").format(Math.round(n)); }
export function fmtROAS(n: number): string { return `${n.toFixed(2)}x`; }
export function fmtPct(n: number, digits = 1): string { const sign = n > 0 ? "+" : ""; return `${sign}${n.toFixed(digits)}%`; }
