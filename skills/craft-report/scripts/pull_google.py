#!/usr/bin/env python3
"""
Pull Google Ads data for the MTD report.

Looks for GOOGLE_ADS_CUSTOMER_ID in client's secrets.env first. If missing,
asks the operator to supply it (or falls back to listing accessible customers
under the MCC so the operator can pick the right one).

OAuth creds (developer token, client id/secret, refresh token, manager id)
are shared across clients — pulled from any existing client's secrets.env if
absent from the target client's.

Writes: clients/{slug}/mtd-reports/{YYYY-MM}/data/google.json

Usage:
  python3 scripts/pull_google.py <slug> [--report-month YYYY-MM] [--as-of YYYY-MM-DD]
  python3 scripts/pull_google.py <slug> --list-customers   # discover a customer ID
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
WORKSPACE_ROOT = SCRIPT_DIR.parents[3]

GADS_API = "https://googleads.googleapis.com/v23"
OAUTH_URL = "https://oauth2.googleapis.com/token"

SHARED_CREDS_CANDIDATES = [
    "ts_twelve_south", "aot_art_of_teaching", "pp_primal_path", "rd_resilient_daughters",
]


def load_creds(slug: str) -> dict:
    load_dotenv(WORKSPACE_ROOT / ".env")
    client_env = WORKSPACE_ROOT / "clients" / slug / "credentials" / "secrets.env"
    if client_env.exists():
        load_dotenv(client_env, override=True)

    needed = ["GOOGLE_ADS_DEVELOPER_TOKEN", "GOOGLE_ADS_CLIENT_ID", "GOOGLE_ADS_CLIENT_SECRET",
              "GOOGLE_ADS_REFRESH_TOKEN", "GOOGLE_ADS_MANAGER_ID"]

    # Fall back to a sibling client's creds for shared OAuth pieces
    if not all(os.getenv(k) for k in needed):
        for cand in SHARED_CREDS_CANDIDATES:
            p = WORKSPACE_ROOT / "clients" / cand / "credentials" / "secrets.env"
            if p.exists():
                load_dotenv(p, override=False)  # don't overwrite client-specific
                if all(os.getenv(k) for k in needed):
                    break

    missing = [k for k in needed if not os.getenv(k)]
    if missing:
        raise SystemExit(f"Missing Google Ads OAuth creds: {', '.join(missing)}")

    customer_id = os.getenv("GOOGLE_ADS_CUSTOMER_ID")
    return {
        "dev_token": os.getenv("GOOGLE_ADS_DEVELOPER_TOKEN"),
        "client_id": os.getenv("GOOGLE_ADS_CLIENT_ID"),
        "client_secret": os.getenv("GOOGLE_ADS_CLIENT_SECRET"),
        "refresh_token": os.getenv("GOOGLE_ADS_REFRESH_TOKEN"),
        "manager_id": os.getenv("GOOGLE_ADS_MANAGER_ID"),
        "customer_id": customer_id,
    }


def access_token(creds: dict) -> str:
    r = requests.post(OAUTH_URL, data={
        "client_id": creds["client_id"],
        "client_secret": creds["client_secret"],
        "refresh_token": creds["refresh_token"],
        "grant_type": "refresh_token",
    }, timeout=30)
    r.raise_for_status()
    return r.json()["access_token"]


def headers(token: str, creds: dict, customer_override: str | None = None) -> dict:
    return {
        "Authorization": f"Bearer {token}",
        "developer-token": creds["dev_token"],
        "login-customer-id": (customer_override or creds["manager_id"]).replace("-", ""),
    }


def list_customers(creds: dict):
    token = access_token(creds)
    q = """
        SELECT customer_client.id, customer_client.descriptive_name,
               customer_client.status, customer_client.manager
        FROM customer_client
    """
    r = requests.post(
        f"{GADS_API}/customers/{creds['manager_id'].replace('-', '')}/googleAds:search",
        headers=headers(token, creds), json={"query": q}, timeout=60,
    )
    r.raise_for_status()
    rows = r.json().get("results", [])
    clients = []
    for row in rows:
        c = row.get("customerClient", {})
        if c.get("manager"):
            continue
        clients.append({
            "id": c.get("id"),
            "name": c.get("descriptiveName"),
            "status": c.get("status"),
        })
    clients.sort(key=lambda x: (x["status"] != "ENABLED", (x["name"] or "").lower()))
    return clients


def query_insights(creds: dict, customer_id: str, since: str, until: str,
                   segments: str = "", extra_select: str = "") -> list[dict]:
    token = access_token(creds)
    cust = customer_id.replace("-", "")
    select_fields = "metrics.cost_micros, metrics.conversions_value, metrics.conversions, metrics.clicks, metrics.impressions"
    if extra_select:
        select_fields += ", " + extra_select
    select_parts = [select_fields]
    if segments:
        select_parts.insert(0, segments)
    q = f"""
        SELECT {', '.join(select_parts)}
        FROM customer
        WHERE segments.date BETWEEN '{since}' AND '{until}'
    """
    r = requests.post(
        f"{GADS_API}/customers/{cust}/googleAds:search",
        headers=headers(token, creds), json={"query": q}, timeout=90,
    )
    if r.status_code != 200:
        raise SystemExit(f"Google Ads error {r.status_code}: {r.text[:500]}")
    return r.json().get("results", [])


def aggregate(rows: list[dict]) -> dict:
    spend = revenue = conv = 0.0
    clicks = impressions = 0
    for row in rows:
        m = row.get("metrics", {})
        spend += float(m.get("costMicros", 0) or 0) / 1e6
        revenue += float(m.get("conversionsValue", 0) or 0)
        conv += float(m.get("conversions", 0) or 0)
        clicks += int(m.get("clicks", 0) or 0)
        impressions += int(m.get("impressions", 0) or 0)
    return {
        "spend": spend, "revenue": revenue,
        "roas": (revenue / spend) if spend > 0 else 0,
        "conversions": conv, "clicks": clicks, "impressions": impressions,
        "cpc": (spend / clicks) if clicks > 0 else 0,
        "ctr": (clicks / impressions * 100) if impressions > 0 else 0,
    }


def shift_month(yyyy_mm: str, delta: int) -> str:
    y, m = [int(x) for x in yyyy_mm.split("-")]
    idx = y * 12 + (m - 1) + delta
    ny, nm = divmod(idx, 12)
    return f"{ny:04d}-{nm+1:02d}"


def last_day_of_month(yyyy_mm: str) -> str:
    y, m = [int(x) for x in yyyy_mm.split("-")]
    return f"{yyyy_mm}-{calendar.monthrange(y, m)[1]:02d}"


def window(creds, cust, since, until):
    rows = query_insights(creds, cust, since, until)
    b = aggregate(rows)
    b["since"] = since
    b["until"] = until
    return b


def campaign_breakdown(creds, cust, since, until):
    token = access_token(creds)
    q = f"""
        SELECT campaign.name,
               metrics.cost_micros, metrics.conversions_value,
               metrics.conversions, metrics.clicks, metrics.impressions
        FROM campaign
        WHERE segments.date BETWEEN '{since}' AND '{until}'
    """
    r = requests.post(
        f"{GADS_API}/customers/{cust.replace('-','')}/googleAds:search",
        headers=headers(token, creds), json={"query": q}, timeout=60,
    )
    r.raise_for_status()
    by_campaign: dict[str, dict] = {}
    for row in r.json().get("results", []):
        name = row.get("campaign", {}).get("name", "")
        m = row.get("metrics", {})
        entry = by_campaign.setdefault(name, {"campaign": name, "spend": 0, "revenue": 0, "conversions": 0, "clicks": 0})
        entry["spend"] += float(m.get("costMicros", 0) or 0) / 1e6
        entry["revenue"] += float(m.get("conversionsValue", 0) or 0)
        entry["conversions"] += float(m.get("conversions", 0) or 0)
        entry["clicks"] += int(m.get("clicks", 0) or 0)
    out = []
    for v in by_campaign.values():
        if v["spend"] < 10:
            continue
        v["roas"] = (v["revenue"] / v["spend"]) if v["spend"] else 0
        out.append(v)
    out.sort(key=lambda x: -x["spend"])
    return out


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("slug")
    ap.add_argument("--report-month")
    ap.add_argument("--as-of")
    ap.add_argument("--customer-id", help="Override GOOGLE_ADS_CUSTOMER_ID")
    ap.add_argument("--list-customers", action="store_true")
    args = ap.parse_args()

    creds = load_creds(args.slug)
    if args.customer_id:
        creds["customer_id"] = args.customer_id

    if args.list_customers:
        clients = list_customers(creds)
        print(f"Accessible customers under manager {creds['manager_id']}:\n")
        for c in clients:
            print(f"  {c['id']:<15} {c['status']:<10} {c['name']}")
        return

    if not creds["customer_id"]:
        print("ERROR: no GOOGLE_ADS_CUSTOMER_ID for this client.")
        print("Run with --list-customers to discover, then pass --customer-id <id>")
        print("or add GOOGLE_ADS_CUSTOMER_ID to clients/{slug}/credentials/secrets.env")
        sys.exit(1)

    today = date.today()
    as_of = datetime.strptime(args.as_of, "%Y-%m-%d").date() if args.as_of else today
    report_month = args.report_month or f"{as_of.year:04d}-{as_of.month:02d}"
    mtd_end = as_of.isoformat() if report_month == f"{as_of.year:04d}-{as_of.month:02d}" else last_day_of_month(report_month)
    day_in_month = int(mtd_end.split("-")[2])

    prev_month = shift_month(report_month, -1)
    pm_y, pm_m = [int(x) for x in prev_month.split("-")]
    pm_last = calendar.monthrange(pm_y, pm_m)[1]
    prev_month_same_end = f"{prev_month}-{min(day_in_month, pm_last):02d}"

    prev_year_month = shift_month(report_month, -12)
    py_y, py_m = [int(x) for x in prev_year_month.split("-")]
    py_last = calendar.monthrange(py_y, py_m)[1]
    prev_year_same_end = f"{prev_year_month}-{min(day_in_month, py_last):02d}"

    last_7_end = as_of - timedelta(days=1)
    last_7_start = last_7_end - timedelta(days=6)
    prior_7_end = last_7_start - timedelta(days=1)
    prior_7_start = prior_7_end - timedelta(days=6)

    print(f"Pulling Google for {args.slug}, customer {creds['customer_id']}")

    cust = creds["customer_id"]
    windows = {
        "mtd": window(creds, cust, f"{report_month}-01", mtd_end),
        "lm_samewindow": window(creds, cust, f"{prev_month}-01", prev_month_same_end),
        "lm_full": window(creds, cust, f"{prev_month}-01", last_day_of_month(prev_month)),
        "ly_samewindow": window(creds, cust, f"{prev_year_month}-01", prev_year_same_end),
        "lw": window(creds, cust, last_7_start.isoformat(), last_7_end.isoformat()),
        "pw": window(creds, cust, prior_7_start.isoformat(), prior_7_end.isoformat()),
    }

    # Daily MTD
    token = access_token(creds)
    q_daily = f"""
        SELECT segments.date, metrics.cost_micros, metrics.conversions_value,
               metrics.conversions, metrics.clicks
        FROM customer
        WHERE segments.date BETWEEN '{report_month}-01' AND '{mtd_end}'
        ORDER BY segments.date
    """
    r = requests.post(
        f"{GADS_API}/customers/{cust.replace('-','')}/googleAds:search",
        headers=headers(token, creds), json={"query": q_daily}, timeout=60,
    )
    r.raise_for_status()
    daily = []
    for row in r.json().get("results", []):
        m = row.get("metrics", {})
        spend = float(m.get("costMicros", 0) or 0) / 1e6
        rev = float(m.get("conversionsValue", 0) or 0)
        daily.append({
            "date": row.get("segments", {}).get("date"),
            "spend": spend, "revenue": rev,
            "roas": (rev / spend) if spend > 0 else 0,
            "conversions": float(m.get("conversions", 0) or 0),
            "clicks": int(m.get("clicks", 0) or 0),
        })

    # Campaign breakdown MTD
    campaigns = campaign_breakdown(creds, cust, f"{report_month}-01", mtd_end)

    # Monthly history for MER denominator
    monthly = []
    history_start = shift_month(report_month, -12)
    cur = history_start
    while cur <= report_month:
        m_start = f"{cur}-01"
        m_end = mtd_end if cur == report_month else last_day_of_month(cur)
        rows = query_insights(creds, cust, m_start, m_end, segments="segments.month")
        agg = aggregate(rows)
        agg["month"] = cur
        agg["partial"] = (cur == report_month)
        monthly.append(agg)
        cur = shift_month(cur, 1)

    out_dir = WORKSPACE_ROOT / "clients" / args.slug / "mtd-reports" / report_month / "data"
    out_dir.mkdir(parents=True, exist_ok=True)
    out = {
        "slug": args.slug,
        "report_month": report_month,
        "as_of": as_of.isoformat(),
        "customer_id": cust,
        "windows": windows,
        "daily": daily,
        "campaigns": campaigns,
        "monthly": monthly,
    }
    path = out_dir / "google.json"
    with open(path, "w") as f:
        json.dump(out, f, indent=2, default=str)
    print(f"Wrote {path}")
    print(f"  MTD: ${windows['mtd']['spend']:,.2f} spend, ${windows['mtd']['revenue']:,.2f} rev, {windows['mtd']['roas']:.2f}x")


if __name__ == "__main__":
    main()
