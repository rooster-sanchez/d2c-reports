#!/usr/bin/env python3
"""
Scaffold a per-client MTD report Next.js app at apps/mtd-reports/{slug}-{YYYY-MM}/
from _template/ and the per-client data files (meta.json, google.json,
shopify.json, brand.json). Writes a fully-rendered src/lib/data.ts and
injects brand tokens into src/app/globals.css and src/app/layout.tsx.

Usage:
  python3 scripts/scaffold_report.py <slug> --report-month YYYY-MM
    [--narrative <path.json>]  # optional: agent-authored "what worked / didn't" notes

The narrative JSON (optional) has shape:
  {
    "worked": [{"channel": "Meta", "name": "...", "friendly": "...",
                "spend": 0, "revenue": 0, "roas": 0, "purchases": 0,
                "note": "..."}, ...],
    "didnt_work": [...],
    "shopify_mtd_note": "..."
  }

If --narrative is omitted, the script auto-generates worked/didnt_work from
the top Meta ad-sets + Google campaigns using simple heuristics, and uses a
generic MTD note. The main agent is expected to overwrite the narrative file
before running this for a high-quality report.
"""

from __future__ import annotations

import argparse
import calendar
import json
import shutil
from datetime import datetime, date, timedelta
from pathlib import Path

SCRIPT_DIR = Path(__file__).resolve().parent
SKILL_ROOT = SCRIPT_DIR.parent
TEMPLATE_DIR = SKILL_ROOT / "_template"
WORKSPACE_ROOT = SCRIPT_DIR.parents[3]

MER_FLOOR = 2.5
MER_GOAL = 3.0


def load_client_overrides(slug: str) -> dict:
    """Load per-client report config (floor/goal) if it exists."""
    cfg = WORKSPACE_ROOT / "clients" / slug / "configs" / "mtd_report.json"
    if cfg.exists():
        try:
            return json.loads(cfg.read_text())
        except Exception:
            return {}
    return {}


def fmt_money(n: float) -> str:
    return f"${n:,.0f}"


def month_label(ym: str) -> str:
    y, m = ym.split("-")
    return f"{calendar.month_abbr[int(m)]} '{y[-2:]}"


def shift_month(ym: str, delta: int) -> str:
    y, m = [int(x) for x in ym.split("-")]
    idx = y * 12 + (m - 1) + delta
    ny, nm = divmod(idx, 12)
    return f"{ny:04d}-{nm+1:02d}"


def month_window_label(since: str, until: str) -> str:
    since_d = datetime.strptime(since, "%Y-%m-%d")
    until_d = datetime.strptime(until, "%Y-%m-%d")
    same_month = since_d.month == until_d.month and since_d.year == until_d.year
    if same_month:
        return f"{since_d.strftime('%b %-d')} – {until_d.strftime('%b %-d, %Y')}"
    return f"{since_d.strftime('%b %-d, %Y')} – {until_d.strftime('%b %-d, %Y')}"


def safe_sort_by_spend(items, desc=True):
    return sorted(items, key=lambda x: (x.get("spend") or 0), reverse=desc)


# ———————————————————————————————————————————————————————————
# data.ts builder — generates the entire file deterministically
# ———————————————————————————————————————————————————————————

def build_meta_block(label: str, range_label: str, w: dict) -> str:
    return f"""{{
  label: {json.dumps(label)}, range: {json.dumps(range_label)},
  spend: {w.get('spend',0):.2f}, revenue: {w.get('revenue',0):.2f}, roas: {w.get('roas',0):.4f},
  purchases: {int(w.get('purchases') or 0)}, clicks: {int(w.get('clicks') or 0)}, impressions: {int(w.get('impressions') or 0)}, reach: {int(w.get('reach') or 0)},
  cpc: {w.get('cpc',0):.4f}, cpm: {w.get('cpm',0):.4f}, ctr: {w.get('ctr',0):.4f},
}}"""


def build_google_block(label: str, range_label: str, w: dict) -> str:
    return f"""{{
  label: {json.dumps(label)}, range: {json.dumps(range_label)},
  spend: {w.get('spend',0):.2f}, revenue: {w.get('revenue',0):.2f}, roas: {w.get('roas',0):.4f},
  conversions: {w.get('conversions',0):.1f}, clicks: {int(w.get('clicks') or 0)}, impressions: {int(w.get('impressions') or 0)},
  cpc: {w.get('cpc',0):.4f}, ctr: {w.get('ctr',0):.4f},
}}"""


def render_data_ts(slug: str, report_month: str, as_of: str,
                   meta: dict, google: dict, shopify: dict,
                   narrative: dict, client_name: str,
                   mer_floor: float = MER_FLOOR, mer_goal: float = MER_GOAL) -> str:
    mtd = meta["windows"]["mtd"]
    mtd_google = google.get("windows", {}).get("mtd", {"spend":0,"revenue":0,"roas":0,"conversions":0,"clicks":0,"impressions":0,"cpc":0,"ctr":0,"since":mtd["since"],"until":mtd["until"]})

    # Date labels
    as_of_d = datetime.strptime(as_of, "%Y-%m-%d").date()
    day = as_of_d.day
    month_full = calendar.month_name[as_of_d.month]
    month_short = calendar.month_abbr[as_of_d.month]
    date_label = f"{month_full} 1 – {month_full} {day}, {as_of_d.year}"
    generated_at = as_of_d.strftime("%B %-d, %Y")
    report_title = f"{month_full} MTD Report"

    # Generic month labels for components (replaces hardcoded "April MTD" / "March")
    mtd_label_str = f"{month_short} '{str(as_of_d.year)[-2:]}"
    mtd_days_int = day
    prev_month_idx = (as_of_d.month - 2) % 12 + 1
    prev_year = as_of_d.year - 1 if as_of_d.month == 1 else as_of_d.year
    prev_label_str = f"{calendar.month_name[prev_month_idx]}"
    # Days in previous calendar month
    prev_days_int = calendar.monthrange(prev_year, prev_month_idx)[1]

    # Ranges for each window
    ranges = {
        k: month_window_label(w["since"], w["until"])
        for k, w in meta["windows"].items()
    }

    lm_full_label = f"{calendar.month_name[int(meta['windows']['lm_full']['since'][5:7])]} {meta['windows']['lm_full']['since'][:4]}"

    # ── Meta windows
    meta_blocks = {
        "meta_mtd":            build_meta_block(f"{month_short} MTD", ranges["mtd"], mtd),
        "meta_lm_samewindow":  build_meta_block("Last month (same window)", ranges["lm_samewindow"], meta["windows"]["lm_samewindow"]),
        "meta_lm_full":        build_meta_block("Last month (full)", lm_full_label, meta["windows"]["lm_full"]),
        "meta_ly":             build_meta_block("Last year (same window)", ranges["ly_samewindow"], meta["windows"]["ly_samewindow"]),
        "meta_lw":             build_meta_block("Last 7 days", ranges["lw"], meta["windows"]["lw"]),
        "meta_pw":             build_meta_block("Prior 7 days", ranges["pw"], meta["windows"]["pw"]),
    }

    google_blocks = {
        "google_mtd":           build_google_block(f"{month_short} MTD", ranges["mtd"], mtd_google),
        "google_lm_samewindow": build_google_block("Last month (same window)", ranges["lm_samewindow"], google["windows"].get("lm_samewindow", {})),
        "google_lm_full":       build_google_block("Last month (full)", lm_full_label, google["windows"].get("lm_full", {})),
        "google_ly":            build_google_block("Last year (same window)", ranges["ly_samewindow"], google["windows"].get("ly_samewindow", {})),
        "google_lw":            build_google_block("Last 7 days", ranges["lw"], google["windows"].get("lw", {})),
        "google_pw":            build_google_block("Prior 7 days", ranges["pw"], google["windows"].get("pw", {})),
    }

    # ── Monthly MER (13 months of full closed months)
    # Combine Meta + Google monthly, pair with Shopify net for same month
    shopify_by_month = {m["month"]: m for m in shopify.get("history", [])}
    g_monthly_by = {m["month"]: m for m in google.get("monthly", [])}
    monthly_rows = []
    for mm in meta.get("monthly", []):
        if mm.get("partial"):
            continue  # current (partial) month handled separately
        ym = mm["month"]
        shop = shopify_by_month.get(ym)
        if not shop:
            continue
        gm = g_monthly_by.get(ym, {"spend": 0, "revenue": 0})
        meta_spend = mm.get("spend", 0)
        meta_rev = mm.get("revenue", 0)
        google_spend = gm.get("spend", 0)
        google_rev = gm.get("revenue", 0)
        paid_spend = meta_spend + google_spend
        paid_attr = meta_rev + google_rev
        mer = (shop["net_sales"] / paid_spend) if paid_spend > 0 else 0
        monthly_rows.append({
            "month": ym,
            "label": month_label(ym),
            "meta_spend": meta_spend,
            "google_spend": google_spend,
            "paid_spend": paid_spend,
            "paid_attributed_revenue": paid_attr,
            "shopify_net": shop["net_sales"],
            "orders": shop["orders"],
            "aov": shop.get("aov", 0),
            "mer": mer,
        })

    # Shopify MTD (actual or None — scaffold requires actual)
    mtd_shop = shopify.get("mtd")
    if not mtd_shop:
        # Fallback: estimate via last-closed month ratio
        if monthly_rows:
            last = monthly_rows[-1]
            ratio = (last["shopify_net"] / last["paid_attributed_revenue"]) if last["paid_attributed_revenue"] else 1.0
        else:
            ratio = 1.0
        blended_mtd_spend = mtd["spend"] + mtd_google.get("spend", 0)
        blended_mtd_rev = mtd["revenue"] + mtd_google.get("revenue", 0)
        est_shop = blended_mtd_rev * ratio
        mtd_shop = {
            "range_label": ranges["mtd"],
            "orders": 0,
            "net_sales": est_shop,
            "aov": 0,
            "estimated": True,
        }

    blended_mtd_spend = mtd["spend"] + mtd_google.get("spend", 0)
    mtd_mer = (mtd_shop["net_sales"] / blended_mtd_spend) if blended_mtd_spend > 0 else 0

    trailing12_spend = sum(r["paid_spend"] for r in monthly_rows)
    trailing12_shop = sum(r["shopify_net"] for r in monthly_rows)
    trailing12_mer = (trailing12_shop / trailing12_spend) if trailing12_spend > 0 else 0
    last_closed = monthly_rows[-1] if monthly_rows else None

    # ── Daily (for DailyTrendChart)
    daily_lines = []
    # Pair by date
    g_daily_by = {d["date"]: d for d in google.get("daily", [])}
    for md in meta.get("daily", []):
        dt = md["date"]
        gd = g_daily_by.get(dt, {"spend": 0, "revenue": 0})
        ms = md.get("spend", 0)
        mr = md.get("revenue", 0)
        gs = gd.get("spend", 0)
        gr = gd.get("revenue", 0)
        daily_lines.append((dt, ms, mr, gs, gr))

    daily_ts = "[\n"
    for i, (dt, ms, mr, gs, gr) in enumerate(daily_lines):
        total_s = ms + gs
        total_r = mr + gr
        if total_s <= 0:
            continue
        roas = total_r / total_s
        daily_ts += f"  {{ date: {json.dumps(dt)}, day: {i+1}, meta_spend: {ms:.2f}, meta_revenue: {mr:.2f}, google_spend: {gs:.2f}, google_revenue: {gr:.2f}, blended_spend: {total_s:.2f}, blended_revenue: {total_r:.2f}, blended_roas: {roas:.4f} }},\n"
    daily_ts += "]"

    # First/second half
    closed_daily = [(dt, ms+gs, mr+gr) for dt, ms, mr, gs, gr in daily_lines if (ms+gs) > 0]
    half = len(closed_daily) // 2
    h1 = closed_daily[:half]
    h2 = closed_daily[half:]
    def agg(rows):
        s = sum(r[1] for r in rows)
        r = sum(r[2] for r in rows)
        return s, r, (r/s) if s>0 else 0
    h1_s, h1_r, h1_roas = agg(h1)
    h2_s, h2_r, h2_roas = agg(h2)
    h1_label = f"First half · {datetime.strptime(h1[0][0],'%Y-%m-%d').strftime('%b %-d')} – {datetime.strptime(h1[-1][0],'%Y-%m-%d').strftime('%b %-d')}" if h1 else "First half"
    h2_label = f"Second half · {datetime.strptime(h2[0][0],'%Y-%m-%d').strftime('%b %-d')} – {datetime.strptime(h2[-1][0],'%Y-%m-%d').strftime('%b %-d')}" if h2 else "Second half"

    # ── Reach history
    reach_rows = meta.get("reach_history", [])
    reach_ts = "[\n"
    for r in reach_rows:
        reach_ts += (
            f"  {{ label: {json.dumps(month_label(r['month']))}, month: {json.dumps(r['month'])}, "
            f"monthly_reach: {r['monthly_reach']}, cum_reach: {r['cum_reach']}, "
            f"net_new: {r['net_new']}, prev_reached: {r['prev_reached']}, "
            f"pct_new: {r['pct_new']}"
        )
        if r.get("partial"):
            reach_ts += ", partial: true"
        reach_ts += " },\n"
    reach_ts += "]"

    # ── Shopify history (for the trend chart)
    shop_hist_ts = "[\n"
    for m in shopify.get("history", []):
        shop_hist_ts += (
            f"  {{ month: {json.dumps(m['month'])}, label: {json.dumps(month_label(m['month']))}, "
            f"orders: {int(m.get('orders',0))}, net_sales: {m['net_sales']:.2f}, "
            f"aov: {m.get('aov',0):.2f} }},\n"
        )
    shop_hist_ts += "]"

    # ── Monthly MER rows
    monthly_ts = "[\n"
    for m in monthly_rows:
        monthly_ts += (
            f"  {{ month: {json.dumps(m['month'])}, label: {json.dumps(m['label'])}, "
            f"meta_spend: {m['meta_spend']:.2f}, google_spend: {m['google_spend']:.2f}, "
            f"paid_spend: {m['paid_spend']:.2f}, paid_attributed_revenue: {m['paid_attributed_revenue']:.2f}, "
            f"shopify_net: {m['shopify_net']:.2f}, orders: {int(m['orders'])}, "
            f"aov: {m.get('aov',0):.2f}, mer: {m['mer']:.4f} }},\n"
        )
    monthly_ts += "]"

    # ── worked / didnt_work
    def render_work_item(it):
        fields = ", ".join(
            f"{k}: {json.dumps(v) if isinstance(v, str) else (int(v) if isinstance(v, bool) == False and isinstance(v, int) else v)}"
            for k, v in it.items() if k != "__meta"
        )
        # Fall back to manual building for safety
        parts = [
            f'channel: {json.dumps(it["channel"])}',
            f'name: {json.dumps(it["name"])}',
            f'friendly: {json.dumps(it["friendly"])}',
            f'spend: {float(it.get("spend", 0)):.2f}',
            f'revenue: {float(it.get("revenue", 0)):.2f}',
            f'roas: {float(it.get("roas", 0)):.4f}',
        ]
        if it.get("purchases") is not None:
            parts.append(f'purchases: {int(it["purchases"])}')
        parts.append(f'note: {json.dumps(it.get("note",""))}')
        return "  { " + ", ".join(parts) + " }"

    worked_ts = "[\n" + ",\n".join(render_work_item(it) for it in narrative.get("worked", [])) + "\n]"
    didnt_ts = "[\n" + ",\n".join(render_work_item(it) for it in narrative.get("didnt_work", [])) + "\n]"

    # ── Strategic moves (deck-mode WorkedLists) — emit empty arrays if narrative
    # doesn't supply them so build never fails. Operator/agent fills in later.
    def render_move(m):
        parts = [f'title: {json.dumps(m.get("title", ""))}']
        if m.get("stat") is not None:
            parts.append(f'stat: {json.dumps(m["stat"])}')
        if m.get("detail") is not None:
            parts.append(f'detail: {json.dumps(m["detail"])}')
        return "  { " + ", ".join(parts) + " }"

    worked_moves_arr = narrative.get("worked_moves", [])
    didnt_moves_arr = narrative.get("didnt_moves", [])
    worked_moves_ts = "[\n" + ",\n".join(render_move(m) for m in worked_moves_arr) + ("\n]" if worked_moves_arr else "]")
    didnt_moves_ts = "[\n" + ",\n".join(render_move(m) for m in didnt_moves_arr) + ("\n]" if didnt_moves_arr else "]")

    # ── Top performers (deck-mode TopPerformers) — empty if narrative doesn't
    # supply. Hand-curated per-report from an ad-level Meta pull.
    def render_top(p):
        parts = [
            f'rank: {int(p.get("rank", 0))}',
            f'adId: {json.dumps(str(p.get("adId", "")))}',
            f'label: {json.dumps(p.get("label", ""))}',
            f'rawAdName: {json.dumps(p.get("rawAdName", ""))}',
            f'campaignName: {json.dumps(p.get("campaignName", ""))}',
            f'formatBadge: {json.dumps(p.get("formatBadge", "Static"))}',
            f'launchDate: {json.dumps(p.get("launchDate", ""))}',
            f'imageSrc: {json.dumps(p.get("imageSrc", ""))}',
            f'spend: {float(p.get("spend", 0)):.2f}',
            f'roas: {float(p.get("roas", 0)):.4f}',
            f'cpc: {float(p.get("cpc", 0)):.4f}',
        ]
        if p.get("note"):
            parts.append(f'note: {json.dumps(p["note"])}')
        if p.get("honorable"):
            parts.append("honorable: true")
        return "  { " + ", ".join(parts) + " }"

    top_arr = narrative.get("top_performers", [])
    top_window = narrative.get("top_performers_window", {"label": "Last 30 days", "range": ""})
    top_performers_ts = "[\n" + ",\n".join(render_top(p) for p in top_arr) + ("\n]" if top_arr else "]")
    top_window_ts = (
        f"{{ label: {json.dumps(top_window.get('label', 'Last 30 days'))}, "
        f"range: {json.dumps(top_window.get('range', ''))} }}"
    )

    # ── MTD Shopify block
    mtd_shop_ts = (
        f"{{ range: {json.dumps(mtd_shop.get('range_label') or ranges['mtd'])}, "
        f"orders: {int(mtd_shop.get('orders') or 0)}, "
        f"net_sales: {mtd_shop.get('net_sales', 0):.2f}, "
        f"aov: {mtd_shop.get('aov', 0):.2f}, "
        f"estimated: {str(bool(mtd_shop.get('estimated', False))).lower()} }}"
    )

    shopify_mtd_note = narrative.get(
        "shopify_mtd_note",
        "Shopify MTD net sales provided by the operator at pull time."
        if not mtd_shop.get("estimated")
        else "Shopify MTD is an estimate (API not connected) derived from the last closed month's paid-to-store ratio. The client can confirm the exact number from Shopify admin."
    )

    # ── Build data.ts
    return f"""// AUTO-GENERATED by .claude/skills/craft-report/scripts/scaffold_report.py
// Client: {client_name} ({slug}) · Report month: {report_month} · As of: {as_of}
// Do not edit by hand — re-run the skill to regenerate.

export const meta = {{
  client_name: {json.dumps(client_name)},
  report_title: {json.dumps(report_title)},
  date_label: {json.dumps(date_label)},
  generated_at: {json.dumps(generated_at)},
  as_of: {json.dumps(as_of)},
  prepared_for: "Client",
  prepared_by: "Media Made Simple",
}};

export const mer_floor = {mer_floor};
export const mer_goal = {mer_goal};

// Generic month labels — used by OneTable, MERContextChart, etc.
export const mtd_label = {json.dumps(mtd_label_str)};
export const mtd_days = {mtd_days_int};
export const prev_label = {json.dumps(prev_label_str)};
export const prev_days = {prev_days_int};

// ——————————————————————————————————————————————————————————————
// Meta Ads — per-window
// ——————————————————————————————————————————————————————————————

export type MetricBlock = {{
  label: string; range: string;
  spend: number; revenue: number; roas: number;
  purchases: number; clicks: number; impressions: number; reach: number;
  cpc: number; cpm: number; ctr: number;
}};

export const meta_mtd: MetricBlock = {meta_blocks['meta_mtd']};
export const meta_lm_samewindow: MetricBlock = {meta_blocks['meta_lm_samewindow']};
export const meta_lm_full: MetricBlock = {meta_blocks['meta_lm_full']};
export const meta_ly: MetricBlock = {meta_blocks['meta_ly']};
export const meta_lw: MetricBlock = {meta_blocks['meta_lw']};
export const meta_pw: MetricBlock = {meta_blocks['meta_pw']};

// ——————————————————————————————————————————————————————————————
// Google Ads — per-window
// ——————————————————————————————————————————————————————————————

export type GoogleBlock = {{
  label: string; range: string;
  spend: number; revenue: number; roas: number;
  conversions: number; clicks: number; impressions: number;
  cpc: number; ctr: number;
}};

export const google_mtd: GoogleBlock = {google_blocks['google_mtd']};
export const google_lm_samewindow: GoogleBlock = {google_blocks['google_lm_samewindow']};
export const google_lm_full: GoogleBlock = {google_blocks['google_lm_full']};
export const google_ly: GoogleBlock = {google_blocks['google_ly']};
export const google_lw: GoogleBlock = {google_blocks['google_lw']};
export const google_pw: GoogleBlock = {google_blocks['google_pw']};

// ——————————————————————————————————————————————————————————————
// Blended (Meta + Google, paid-attributed)
// ——————————————————————————————————————————————————————————————

export type BlendedBlock = {{ label: string; range: string; spend: number; revenue: number; roas: number; }};

function blend(m: MetricBlock, g: GoogleBlock, label: string, range: string): BlendedBlock {{
  const spend = m.spend + g.spend;
  const revenue = m.revenue + g.revenue;
  return {{ label, range, spend, revenue, roas: spend ? revenue / spend : 0 }};
}}

export const blended_mtd            = blend(meta_mtd,            google_mtd,            "MTD", meta_mtd.range);
export const blended_lm_samewindow  = blend(meta_lm_samewindow,  google_lm_samewindow,  "Last month (same window)", meta_lm_samewindow.range);
export const blended_lm_full        = blend(meta_lm_full,        google_lm_full,        "Last month (full)", meta_lm_full.range);
export const blended_ly             = blend(meta_ly,             google_ly,             "Last year (same window)", meta_ly.range);
export const blended_lw             = blend(meta_lw,             google_lw,             "Last 7 days", meta_lw.range);
export const blended_pw             = blend(meta_pw,             google_pw,             "Prior 7 days", meta_pw.range);

// ——————————————————————————————————————————————————————————————
// Monthly MER (Shopify net ÷ paid spend, full closed months)
// ——————————————————————————————————————————————————————————————

export type MonthlyMER = {{
  month: string; label: string;
  meta_spend: number; google_spend: number;
  paid_spend: number; paid_attributed_revenue: number;
  shopify_net: number; orders: number; aov: number;
  mer: number;
}};

export const monthly: MonthlyMER[] = {monthly_ts};

export const trailing12_paid_spend = {trailing12_spend:.2f};
export const trailing12_shopify    = {trailing12_shop:.2f};
export const trailing12_mer        = {trailing12_mer:.4f};
export const last_closed = monthly[monthly.length - 1];

// ——————————————————————————————————————————————————————————————
// Shopify MTD + history
// ——————————————————————————————————————————————————————————————

export const mtd_shopify = {mtd_shop_ts};
export const mtd_mer = {mtd_mer:.4f};
export const mtd_paid_share = {(blended_mtd_spend and (mtd['revenue'] + mtd_google.get('revenue',0)) / mtd_shop['net_sales']) or 0:.4f};

// Backwards-compat alias
export const mtd_shopify_estimate = mtd_shopify.net_sales;
export const mtd_mer_estimate = mtd_mer;

export type ShopifyMonth = {{ month: string; label: string; orders: number; net_sales: number; aov: number; }};
export const shopify_history: ShopifyMonth[] = {shop_hist_ts};

export const shopify_mtd_note = {json.dumps(shopify_mtd_note)};

// ——————————————————————————————————————————————————————————————
// Daily trend + first/second half aggregates
// ——————————————————————————————————————————————————————————————

export type DailyPoint = {{
  date: string; day: number;
  meta_spend: number; meta_revenue: number;
  google_spend: number; google_revenue: number;
  blended_spend: number; blended_revenue: number;
  blended_roas: number;
}};

export const daily: DailyPoint[] = {daily_ts};

export const daily_rolling7: {{ date: string; day: number; roas: number }}[] = daily.map((_, idx, arr) => {{
  const start = Math.max(0, idx - 6);
  const slice = arr.slice(start, idx + 1);
  const s = slice.reduce((x, p) => x + p.blended_spend, 0);
  const r = slice.reduce((x, p) => x + p.blended_revenue, 0);
  return {{ date: arr[idx].date, day: arr[idx].day, roas: s ? r / s : 0 }};
}});

export const first_half  = {{ spend: {h1_s:.2f}, revenue: {h1_r:.2f}, roas: {h1_roas:.4f}, label: {json.dumps(h1_label)} }};
export const second_half = {{ spend: {h2_s:.2f}, revenue: {h2_r:.2f}, roas: {h2_roas:.4f}, label: {json.dumps(h2_label)} }};

// ——————————————————————————————————————————————————————————————
// Net new reach (Meta)
// ——————————————————————————————————————————————————————————————

export type ReachMonth = {{
  label: string; month: string;
  monthly_reach: number; cum_reach: number;
  net_new: number; prev_reached: number;
  pct_new: number; partial?: boolean;
}};

export const reach_history: ReachMonth[] = {reach_ts};

// ——————————————————————————————————————————————————————————————
// What worked / didn't
// ——————————————————————————————————————————————————————————————

export type WorkItem = {{ channel: "Meta" | "Google"; name: string; friendly: string; spend: number; revenue: number; roas: number; purchases?: number; note: string; }};

export const worked: WorkItem[] = {worked_ts};
export const didnt_work: WorkItem[] = {didnt_ts};

// ——————————————————————————————————————————————————————————————
// Strategic moves (deck-mode WorkedLists)
// Empty arrays are valid — page.tsx will render placeholders.
// ——————————————————————————————————————————————————————————————

export type Move = {{ title: string; stat?: string; detail?: string }};

export const worked_moves: Move[] = {worked_moves_ts};
export const didnt_moves: Move[] = {didnt_moves_ts};

// ——————————————————————————————————————————————————————————————
// Top Performers · ad-level (deck-mode TopPerformers)
// Hand-curated from /tmp/pull_top_ads.py output. Images live under public/top-performers/.
// ——————————————————————————————————————————————————————————————

export type TopPerformer = {{
  rank: number;
  adId: string;
  label: string;
  rawAdName: string;
  campaignName: string;
  formatBadge: "Flex Ad" | "Static" | "Video" | "Dynamic";
  launchDate: string;
  imageSrc: string;
  spend: number;
  roas: number;
  cpc: number;
  note?: string;
  honorable?: boolean;
}};

export const top_performers_window = {top_window_ts};
export const top_performers: TopPerformer[] = {top_performers_ts};

// ——————————————————————————————————————————————————————————————
// Helpers
// ——————————————————————————————————————————————————————————————

export function pct(now: number, then: number): number {{
  if (!then) return 0;
  return ((now - then) / then) * 100;
}}

export function fmtUSD(n: number, opts: {{ decimals?: number }} = {{}}): string {{
  return new Intl.NumberFormat("en-US", {{
    style: "currency", currency: "USD",
    minimumFractionDigits: opts.decimals ?? 0,
    maximumFractionDigits: opts.decimals ?? 0,
  }}).format(n);
}}

export function fmtNum(n: number): string {{
  return new Intl.NumberFormat("en-US").format(Math.round(n));
}}

export function fmtROAS(n: number): string {{ return `${{n.toFixed(2)}}x`; }}

export function fmtPct(n: number, digits = 1): string {{
  const sign = n > 0 ? "+" : "";
  return `${{sign}}${{n.toFixed(digits)}}%`;
}}
"""


def render_globals_css(palette: dict, font_family: str) -> str:
    p = palette
    return f"""@import "tailwindcss";

/* Brand tokens — generated by scaffold_report.py */
:root {{
  --bg: {p['bg']};
  --bg-deep: {p['bg_deep']};
  --surface: {p['surface']};
  --surface-2: {p['surface_2']};
  --surface-elevated: {p['surface']};
  --border: {p['border']};
  --border-strong: {p['border_strong']};

  --text-primary: {p['text_primary']};
  --text-secondary: {p['text_secondary']};
  --text-tertiary: {p['text_tertiary']};

  --sage: {p['sage']};
  --sage-deep: {p['sage_deep']};
  --sage-soft: {p['sage_soft']};
  --river: {p['river']};
  --sand: {p['sand']};

  --alert: {p['alert']};
  --alert-soft: {p['alert_soft']};
  --success: {p['success']};
  --success-soft: {p['success_soft']};
  --warning: {p['warning']};
  --warning-soft: {p['warning_soft']};

  --font-sans: {json.dumps(font_family)}, system-ui, -apple-system, "Segoe UI", Helvetica, Arial, sans-serif;
  --font-display: {json.dumps(font_family)}, system-ui, sans-serif;
  --font-mono: "JetBrains Mono", ui-monospace, SFMono-Regular, Menlo, monospace;
}}

@theme inline {{
  --color-bg: var(--bg);
  --color-bg-deep: var(--bg-deep);
  --color-surface: var(--surface);
  --color-surface-2: var(--surface-2);
  --color-surface-elevated: var(--surface-elevated);
  --color-border: var(--border);
  --color-border-strong: var(--border-strong);
  --color-text-primary: var(--text-primary);
  --color-text-secondary: var(--text-secondary);
  --color-text-tertiary: var(--text-tertiary);
  --color-sage: var(--sage);
  --color-sage-deep: var(--sage-deep);
  --color-sage-soft: var(--sage-soft);
  --color-river: var(--river);
  --color-sand: var(--sand);
  --color-alert: var(--alert);
  --color-alert-soft: var(--alert-soft);
  --color-success: var(--success);
  --color-success-soft: var(--success-soft);
  --color-warning: var(--warning);
  --color-warning-soft: var(--warning-soft);

  --font-sans: var(--font-sans);
  --font-serif: var(--font-display);
  --font-mono: var(--font-mono);
}}

html, body {{
  background: var(--bg);
  color: var(--text-primary);
  font-family: var(--font-sans);
  -webkit-font-smoothing: antialiased;
  text-rendering: optimizeLegibility;
}}

body {{
  background-color: var(--bg);
  background-image:
    radial-gradient(900px 500px at 88% -5%, color-mix(in srgb, var(--sage) 12%, transparent), transparent 60%),
    radial-gradient(700px 400px at 5% 100%, color-mix(in srgb, var(--sand) 20%, transparent), transparent 60%);
  min-height: 100vh;
}}

::selection {{ background: var(--sage); color: #FFFFFF; }}

.serif   {{ font-family: var(--font-display); letter-spacing: -0.015em; }}
.mono    {{ font-family: var(--font-mono); }}
.numeric {{ font-variant-numeric: tabular-nums; letter-spacing: -0.005em; }}

.hairline {{
  height: 1px;
  background: linear-gradient(to right, transparent, var(--border-strong) 20%, var(--border-strong) 80%, transparent);
}}

@media (prefers-reduced-motion: reduce) {{
  *, *::before, *::after {{
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
    scroll-behavior: auto !important;
  }}
}}
"""


def render_layout_tsx(client_name: str, report_title: str, google_fonts_href: str) -> str:
    return f"""import type {{ Metadata }} from "next";
import "./globals.css";

export const metadata: Metadata = {{
  title: {json.dumps(f"{client_name} — {report_title}")},
  description: "Month-to-date performance across Meta Ads, Google Ads, and Shopify.",
  robots: {{ index: false, follow: false }},
}};

export default function RootLayout({{ children }}: {{ children: React.ReactNode }}) {{
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          rel="stylesheet"
          href={json.dumps(google_fonts_href)}
        />
      </head>
      <body>{{children}}</body>
    </html>
  );
}}
"""


def auto_narrative(meta: dict, google: dict) -> dict:
    """Fallback narrative if the agent hasn't provided one. Picks top/bottom
    spend items by ROAS tier. Notes are plain — the agent should regenerate
    these with real per-client insight before scaffolding."""
    adsets = meta.get("adsets", [])
    campaigns = google.get("campaigns", [])

    worked = []
    didnt = []
    # Meta: top 2 by ROAS among top 6 by spend
    top_by_spend = adsets[:6]
    ranked = sorted(top_by_spend, key=lambda x: -x.get("roas", 0))
    for it in ranked[:2]:
        if it.get("roas", 0) >= MER_FLOOR:
            worked.append({
                "channel": "Meta",
                "name": it.get("adset_name", ""),
                "friendly": it.get("adset_name", "")[:60],
                "spend": it.get("spend", 0),
                "revenue": it.get("revenue", 0),
                "roas": it.get("roas", 0),
                "purchases": it.get("purchases", 0),
                "note": "Auto-detected as a winner by ROAS. Agent to annotate with context.",
            })
    # Meta: biggest spend item if under floor
    for it in ranked[-3:]:
        if it.get("roas", 0) < MER_FLOOR and it.get("spend", 0) > 300:
            didnt.append({
                "channel": "Meta",
                "name": it.get("adset_name", ""),
                "friendly": it.get("adset_name", "")[:60],
                "spend": it.get("spend", 0),
                "revenue": it.get("revenue", 0),
                "roas": it.get("roas", 0),
                "purchases": it.get("purchases", 0),
                "note": "Below the 2.5× floor on meaningful spend. Agent to annotate.",
            })
            break
    # Google
    for c in campaigns[:3]:
        bucket = worked if c.get("roas", 0) >= MER_FLOOR else didnt
        bucket.append({
            "channel": "Google",
            "name": c.get("campaign", ""),
            "friendly": c.get("campaign", "")[:60],
            "spend": c.get("spend", 0),
            "revenue": c.get("revenue", 0),
            "roas": c.get("roas", 0),
            "note": "Google campaign auto-flagged by ROAS. Agent to annotate.",
        })

    return {"worked": worked[:3], "didnt_work": didnt[:4]}


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("slug")
    ap.add_argument("--report-month", required=True)
    ap.add_argument("--narrative", help="Path to narrative JSON (agent-authored)")
    ap.add_argument("--reset", action="store_true", help="Wipe and rebuild the app dir")
    args = ap.parse_args()

    data_dir = WORKSPACE_ROOT / "clients" / args.slug / "mtd-reports" / args.report_month / "data"
    meta = json.loads((data_dir / "meta.json").read_text())
    try:
        google = json.loads((data_dir / "google.json").read_text())
    except FileNotFoundError:
        google = {"windows": {}, "daily": [], "campaigns": [], "monthly": []}
    shopify = json.loads((data_dir / "shopify.json").read_text())
    brand = json.loads((data_dir / "brand.json").read_text())

    client_json = json.loads((WORKSPACE_ROOT / "clients" / args.slug / "client.json").read_text())
    client_name = client_json.get("name", args.slug)

    # Load per-client report config (mer_floor / mer_goal)
    overrides = load_client_overrides(args.slug)
    floor = float(overrides.get("mer_floor", MER_FLOOR))
    goal = float(overrides.get("mer_goal", MER_GOAL))

    narrative = auto_narrative(meta, google)
    if args.narrative:
        override = json.loads(Path(args.narrative).read_text())
        narrative.update({k: v for k, v in override.items() if v is not None})

    # App directory
    app_slug = args.slug.split("_", 1)[-1].replace("_", "-").lower()
    app_dir = WORKSPACE_ROOT / "apps" / "mtd-reports" / f"{app_slug}-{args.report_month}"
    if args.reset and app_dir.exists():
        shutil.rmtree(app_dir)
    app_dir.mkdir(parents=True, exist_ok=True)

    # Copy template (sans node_modules / .next)
    def _ignore(d, names):
        return [n for n in names if n in ("node_modules", ".next", ".vercel")]
    for item in TEMPLATE_DIR.iterdir():
        dst = app_dir / item.name
        if item.is_dir():
            if dst.exists():
                shutil.rmtree(dst)
            shutil.copytree(item, dst, ignore=_ignore)
        else:
            shutil.copy2(item, dst)

    # Overwrite dynamic files
    (app_dir / "src" / "lib" / "data.ts").write_text(
        render_data_ts(args.slug, args.report_month, meta["as_of"], meta, google, shopify, narrative, client_name,
                       mer_floor=floor, mer_goal=goal)
    )
    (app_dir / "src" / "app" / "globals.css").write_text(
        render_globals_css(brand["palette"], brand["font_family"])
    )
    as_of_d = datetime.strptime(meta["as_of"], "%Y-%m-%d").date()
    month_full = calendar.month_name[as_of_d.month]
    report_title = f"{month_full} MTD Report"
    (app_dir / "src" / "app" / "layout.tsx").write_text(
        render_layout_tsx(client_name, report_title, brand["google_fonts_href"])
    )
    pkg = json.loads((app_dir / "package.json").read_text())
    pkg["name"] = f"{app_slug}-{args.report_month}-mtd-report"
    (app_dir / "package.json").write_text(json.dumps(pkg, indent=2) + "\n")

    print(f"Scaffolded: {app_dir}")
    print(f"  Client: {client_name}  Month: {args.report_month}  MER: {mtd_mer_from(data_dir):.2f}x")
    print(f"Next: cd {app_dir.relative_to(WORKSPACE_ROOT)} && npm install && npm run build")


def mtd_mer_from(data_dir: Path) -> float:
    meta = json.loads((data_dir / "meta.json").read_text())
    try:
        google = json.loads((data_dir / "google.json").read_text())
    except FileNotFoundError:
        google = {"windows": {}}
    shopify = json.loads((data_dir / "shopify.json").read_text())
    spend = meta["windows"]["mtd"]["spend"] + google.get("windows", {}).get("mtd", {}).get("spend", 0)
    mtd_shop = shopify.get("mtd")
    if not mtd_shop:
        return 0
    return (mtd_shop["net_sales"] / spend) if spend else 0


if __name__ == "__main__":
    main()
