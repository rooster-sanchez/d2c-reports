#!/usr/bin/env python3
"""
Pull all Meta Ads data needed for an MTD report.

Reads:
  - FB_ACCESS_TOKEN from root .env
  - fb_ad_account_id from clients/{slug}/configs/fb_ads.json (or
    FB_AD_ACCOUNT_ID from clients/{slug}/credentials/secrets.env as fallback)

Pulls (all in a single script — parallel-safe via concurrent runs):
  - 6 comparison windows: MTD, last month same window, last month full,
    last year same window, last 7d, prior 7d
  - Daily spend/revenue for MTD
  - Campaign + ad-set level for MTD (for "what worked / didn't")
  - 13 months of monthly spend/revenue (for MER trend)
  - Monthly reach + cumulative reach (for Net New Reach)
  - Funnel metrics for MTD + prior month same window

Writes: clients/{slug}/mtd-reports/{YYYY-MM}/data/meta.json

Usage:
  python3 scripts/pull_meta.py <slug> [--report-month YYYY-MM] [--as-of YYYY-MM-DD]
"""

from __future__ import annotations

import argparse
import calendar
import json
import os
import sys
from datetime import date, datetime, timedelta
from pathlib import Path

import requests
from dotenv import load_dotenv

SCRIPT_DIR = Path(__file__).resolve().parent
WORKSPACE_ROOT = SCRIPT_DIR.parents[3]  # .claude/skills/craft-report/scripts -> repo root

API = "https://graph.facebook.com/v21.0"


def load_creds(slug: str) -> tuple[str, str]:
    load_dotenv(WORKSPACE_ROOT / ".env")
    client_env = WORKSPACE_ROOT / "clients" / slug / "credentials" / "secrets.env"
    if client_env.exists():
        load_dotenv(client_env, override=True)

    token = os.getenv("FB_ACCESS_TOKEN")
    if not token:
        raise SystemExit("FB_ACCESS_TOKEN missing from root .env")

    # Prefer client configs/fb_ads.json (canonical per CLAUDE.md rule: configs over env)
    fb_ads_cfg = WORKSPACE_ROOT / "clients" / slug / "configs" / "fb_ads.json"
    acct = None
    if fb_ads_cfg.exists():
        with open(fb_ads_cfg) as f:
            acct = json.load(f).get("fb_ad_account_id")
    if not acct:
        acct = os.getenv("FB_AD_ACCOUNT_ID")
    if not acct:
        raise SystemExit(f"No fb_ad_account_id found for {slug}. Check configs/fb_ads.json or secrets.env.")
    return token, str(acct)


def get_insights(acct: str, token: str, since: str, until: str, level: str = "account",
                 fields: str | None = None, time_increment: str | int | None = None,
                 extra_params: dict | None = None) -> list[dict]:
    url = f"{API}/act_{acct}/insights"
    default_fields = (
        "spend,impressions,reach,frequency,inline_link_clicks,cpc,cpm,cpp,ctr,"
        "actions,action_values,purchase_roas"
    )
    params = {
        "access_token": token,
        "time_range": json.dumps({"since": since, "until": until}),
        "fields": fields or default_fields,
        "level": level,
        "limit": 500,
    }
    if time_increment is not None:
        params["time_increment"] = str(time_increment)
    if extra_params:
        params.update(extra_params)

    out: list[dict] = []
    while url:
        r = requests.get(url, params=params, timeout=120)
        if r.status_code != 200:
            raise SystemExit(f"Meta API error {r.status_code}: {r.text[:400]}")
        payload = r.json()
        out.extend(payload.get("data", []))
        # pagination
        next_url = payload.get("paging", {}).get("next")
        if not next_url:
            break
        url = next_url
        params = {}
    return out


def parse_block(d: dict) -> dict:
    spend = float(d.get("spend", 0) or 0)
    impressions = int(d.get("impressions", 0) or 0)
    reach = int(d.get("reach", 0) or 0)
    clicks = int(d.get("inline_link_clicks", 0) or 0)
    cpc = float(d.get("cpc", 0) or 0)
    cpm = float(d.get("cpm", 0) or 0)
    ctr = float(d.get("ctr", 0) or 0)
    frequency = float(d.get("frequency", 0) or 0)

    revenue = 0.0
    purchases = 0
    lp_views = atc = ic = view_content = 0
    for a in d.get("action_values", []) or []:
        if a.get("action_type") == "purchase":
            revenue = float(a.get("value", 0) or 0)
            break
    for a in d.get("actions", []) or []:
        t = a.get("action_type")
        v = int(float(a.get("value", 0) or 0))
        if t == "purchase":
            purchases = v
        elif t == "landing_page_view":
            lp_views = v
        elif t in ("add_to_cart", "offsite_conversion.fb_pixel_add_to_cart"):
            atc = max(atc, v)
        elif t in ("initiate_checkout", "offsite_conversion.fb_pixel_initiate_checkout"):
            ic = max(ic, v)
        elif t in ("view_content", "offsite_conversion.fb_pixel_view_content"):
            view_content = max(view_content, v)

    roas = revenue / spend if spend > 0 else 0.0
    return {
        "spend": spend, "revenue": revenue, "roas": roas,
        "purchases": purchases, "clicks": clicks, "impressions": impressions,
        "reach": reach, "cpc": cpc, "cpm": cpm, "ctr": ctr, "frequency": frequency,
        "lp_views": lp_views, "add_to_cart": atc, "initiate_checkout": ic,
        "view_content": view_content,
    }


def window_block(acct: str, token: str, since: str, until: str) -> dict:
    rows = get_insights(acct, token, since, until, level="account")
    if not rows:
        return {
            "since": since, "until": until, "spend": 0, "revenue": 0, "roas": 0,
            "purchases": 0, "clicks": 0, "impressions": 0, "reach": 0,
            "cpc": 0, "cpm": 0, "ctr": 0, "frequency": 0,
            "lp_views": 0, "add_to_cart": 0, "initiate_checkout": 0, "view_content": 0,
        }
    b = parse_block(rows[0])
    b["since"] = since
    b["until"] = until
    return b


def last_day_of_month(yyyy_mm: str) -> str:
    y, m = [int(x) for x in yyyy_mm.split("-")]
    return f"{yyyy_mm}-{calendar.monthrange(y, m)[1]:02d}"


def shift_month(yyyy_mm: str, delta: int) -> str:
    y, m = [int(x) for x in yyyy_mm.split("-")]
    idx = y * 12 + (m - 1) + delta
    ny, nm = divmod(idx, 12)
    return f"{ny:04d}-{nm+1:02d}"


def months_between(start_ym: str, end_ym: str) -> list[str]:
    months = []
    cur = start_ym
    while cur <= end_ym:
        months.append(cur)
        cur = shift_month(cur, 1)
    return months


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("slug")
    ap.add_argument("--report-month", help="YYYY-MM (default: current month)")
    ap.add_argument("--as-of", help="YYYY-MM-DD, MTD through this date (default: today)")
    args = ap.parse_args()

    token, acct = load_creds(args.slug)

    today = date.today()
    as_of = datetime.strptime(args.as_of, "%Y-%m-%d").date() if args.as_of else today
    report_month = args.report_month or f"{as_of.year:04d}-{as_of.month:02d}"

    month_start = f"{report_month}-01"
    mtd_end = as_of.isoformat() if report_month == f"{as_of.year:04d}-{as_of.month:02d}" else last_day_of_month(report_month)
    day_in_month = int(mtd_end.split("-")[2])

    # Comparison windows
    prev_month = shift_month(report_month, -1)
    prev_month_full_end = last_day_of_month(prev_month)
    prev_month_same_end = f"{prev_month}-{day_in_month:02d}"
    # Clamp prev_month same-window end to last day of prev month
    pm_y, pm_m = [int(x) for x in prev_month.split("-")]
    pm_last = calendar.monthrange(pm_y, pm_m)[1]
    if int(prev_month_same_end.split("-")[2]) > pm_last:
        prev_month_same_end = f"{prev_month}-{pm_last:02d}"

    prev_year_month = shift_month(report_month, -12)
    prev_year_same_end = f"{prev_year_month}-{day_in_month:02d}"
    py_y, py_m = [int(x) for x in prev_year_month.split("-")]
    py_last = calendar.monthrange(py_y, py_m)[1]
    if int(prev_year_same_end.split("-")[2]) > py_last:
        prev_year_same_end = f"{prev_year_month}-{py_last:02d}"

    last_7_end = as_of - timedelta(days=1)  # yesterday
    last_7_start = last_7_end - timedelta(days=6)
    prior_7_end = last_7_start - timedelta(days=1)
    prior_7_start = prior_7_end - timedelta(days=6)

    print(f"Pulling Meta for {args.slug}, report month={report_month}, as-of={as_of}")

    windows = {
        "mtd": (month_start, mtd_end),
        "lm_samewindow": (f"{prev_month}-01", prev_month_same_end),
        "lm_full": (f"{prev_month}-01", prev_month_full_end),
        "ly_samewindow": (f"{prev_year_month}-01", prev_year_same_end),
        "lw": (last_7_start.isoformat(), last_7_end.isoformat()),
        "pw": (prior_7_start.isoformat(), prior_7_end.isoformat()),
    }
    meta_windows = {k: window_block(acct, token, s, u) for k, (s, u) in windows.items()}

    # Daily for MTD
    daily_rows = get_insights(
        acct, token, month_start, mtd_end, level="account",
        fields="spend,action_values,actions,inline_link_clicks",
        time_increment=1,
    )
    daily = []
    for row in daily_rows:
        d = parse_block(row)
        d["date"] = row.get("date_start")
        daily.append(d)

    # Ad-set level for MTD (what worked / didn't)
    adsets = []
    for row in get_insights(
        acct, token, month_start, mtd_end, level="adset",
        fields="adset_name,campaign_name,spend,action_values,actions,inline_link_clicks",
    ):
        block = parse_block(row)
        if block["spend"] < 30:  # noise filter
            continue
        block["adset_name"] = row.get("adset_name", "")
        block["campaign_name"] = row.get("campaign_name", "")
        adsets.append(block)
    adsets.sort(key=lambda x: -x["spend"])

    # 13 months of monthly spend/revenue (for MER trend)
    history_start = shift_month(report_month, -12)
    monthly = []
    for m in months_between(history_start, report_month):
        m_start = f"{m}-01"
        m_end = mtd_end if m == report_month else last_day_of_month(m)
        b = window_block(acct, token, m_start, m_end)
        b["month"] = m
        b["partial"] = (m == report_month)
        monthly.append(b)

    # Monthly + cumulative reach for net-new-reach
    reach_history = []
    prev_cum_reach = 0
    for m in months_between(history_start, report_month):
        m_start = f"{m}-01"
        m_end = mtd_end if m == report_month else last_day_of_month(m)
        monthly_reach = window_block(acct, token, m_start, m_end)["reach"]
        cumulative = window_block(acct, token, f"{history_start}-01", m_end)["reach"]
        net_new = max(0, cumulative - prev_cum_reach)
        prev_reached = max(0, monthly_reach - net_new)
        pct_new = (net_new / monthly_reach * 100) if monthly_reach else 0
        reach_history.append({
            "month": m,
            "monthly_reach": monthly_reach,
            "cum_reach": cumulative,
            "net_new": net_new,
            "prev_reached": prev_reached,
            "pct_new": round(pct_new, 1),
            "partial": (m == report_month),
        })
        prev_cum_reach = cumulative

    # Write output
    out_dir = WORKSPACE_ROOT / "clients" / args.slug / "mtd-reports" / report_month / "data"
    out_dir.mkdir(parents=True, exist_ok=True)
    out = {
        "slug": args.slug,
        "report_month": report_month,
        "as_of": as_of.isoformat(),
        "day_in_month": day_in_month,
        "ad_account": acct,
        "windows": meta_windows,
        "daily": daily,
        "adsets": adsets[:25],
        "monthly": monthly,
        "reach_history": reach_history,
    }
    path = out_dir / "meta.json"
    with open(path, "w") as f:
        json.dump(out, f, indent=2, default=str)
    print(f"Wrote {path}")
    print(f"  MTD: ${meta_windows['mtd']['spend']:,.2f} spend, ${meta_windows['mtd']['revenue']:,.2f} rev, {meta_windows['mtd']['roas']:.2f}x")


if __name__ == "__main__":
    main()
