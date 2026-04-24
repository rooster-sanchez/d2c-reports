#!/usr/bin/env python3
"""
Ingest Shopify historical data from a CSV the operator provides.

Expected CSV format (Shopify "Month" or "Day" export, Finances / Sales report):
  - Must include columns: Month (or Day), Orders, Gross sales, Discounts,
    Returns, Net sales, Shipping charges, Total sales, Average order value

Two modes:
  1. Monthly history CSV (used for MER trend denominator)
  2. Optional MTD snapshot (one row for the current month's partial range)

The operator pastes the MTD Shopify numbers (net sales, orders, AOV) when the
current month isn't yet closed. This script normalizes everything to
shopify.json that scaffold_report.py consumes.

Usage:
  python3 scripts/ingest_shopify.py <slug> --history <path-to-monthly-csv>
                                   [--mtd-net 38195.16 --mtd-orders 93 --mtd-aov 428.06]
                                   [--report-month YYYY-MM]
"""

from __future__ import annotations

import argparse
import calendar
import csv
import json
from pathlib import Path

SCRIPT_DIR = Path(__file__).resolve().parent
WORKSPACE_ROOT = SCRIPT_DIR.parents[3]


def parse_money(s: str) -> float:
    if s is None:
        return 0.0
    s = str(s).strip().replace("$", "").replace(",", "").replace("−", "-")
    if not s or s.lower() == "n/a":
        return 0.0
    return float(s)


def parse_month(s: str) -> str:
    s = str(s).strip()
    # Accept "2025-04-01", "2025-04", "Apr 2025", "April 2025"
    if len(s) >= 7 and s[4] == "-":
        return s[:7]
    try:
        from datetime import datetime
        for fmt in ("%b %Y", "%B %Y", "%m/%Y", "%Y/%m"):
            try:
                return datetime.strptime(s, fmt).strftime("%Y-%m")
            except ValueError:
                continue
    except Exception:
        pass
    return s


def load_history(path: Path) -> list[dict]:
    with open(path, newline="") as f:
        sample = f.read(4096)
        f.seek(0)
        dialect = csv.Sniffer().sniff(sample, delimiters=",;\t")
        reader = csv.DictReader(f, dialect=dialect)
        rows = list(reader)

    out = []
    for r in rows:
        # Shopify "Net sales" column, sometimes "net_sales"
        def col(*names):
            for n in names:
                if n in r:
                    return r[n]
                for k in r:
                    if k and k.strip().lower() == n.lower():
                        return r[k]
            return ""

        month = parse_month(col("Month", "Day", "month", "date"))
        if not month:
            continue
        net = parse_money(col("Net sales", "net_sales", "Net Sales"))
        orders = int(parse_money(col("Orders", "orders"))) if col("Orders", "orders") else 0
        aov_raw = col("Average order value", "AOV", "aov")
        aov = parse_money(aov_raw) if aov_raw else (net / orders if orders else 0)
        if not net and not orders:
            continue
        # Build a label like "Apr '25"
        try:
            y, m = month.split("-")
            import calendar as _cal
            label = f"{_cal.month_abbr[int(m)]} '{y[-2:]}"
        except Exception:
            label = month
        out.append({
            "month": month,
            "label": label,
            "orders": orders,
            "net_sales": net,
            "aov": aov,
        })
    out.sort(key=lambda x: x["month"])
    return out


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("slug")
    ap.add_argument("--history", required=True, help="Path to monthly CSV from Shopify")
    ap.add_argument("--report-month", required=True)
    ap.add_argument("--mtd-net", type=float, default=None)
    ap.add_argument("--mtd-orders", type=int, default=None)
    ap.add_argument("--mtd-aov", type=float, default=None)
    ap.add_argument("--mtd-gross", type=float, default=None)
    ap.add_argument("--mtd-discounts", type=float, default=None)
    ap.add_argument("--mtd-returns", type=float, default=None)
    ap.add_argument("--mtd-shipping", type=float, default=None)
    ap.add_argument("--mtd-range-label", default=None, help='e.g. "Apr 1 – Apr 24, 2026"')
    args = ap.parse_args()

    history = load_history(Path(args.history))
    mtd = None
    if args.mtd_net is not None:
        mtd = {
            "range_label": args.mtd_range_label,
            "orders": args.mtd_orders or 0,
            "gross_sales": args.mtd_gross or 0,
            "discounts": abs(args.mtd_discounts or 0),
            "returns": abs(args.mtd_returns or 0),
            "net_sales": args.mtd_net,
            "shipping": args.mtd_shipping or 0,
            "aov": args.mtd_aov or (args.mtd_net / args.mtd_orders if args.mtd_orders else 0),
        }

    out_dir = WORKSPACE_ROOT / "clients" / args.slug / "mtd-reports" / args.report_month / "data"
    out_dir.mkdir(parents=True, exist_ok=True)
    out = {
        "slug": args.slug,
        "report_month": args.report_month,
        "history": history,
        "mtd": mtd,
    }
    path = out_dir / "shopify.json"
    with open(path, "w") as f:
        json.dump(out, f, indent=2)
    print(f"Wrote {path}")
    print(f"  History months: {len(history)}")
    if mtd:
        print(f"  MTD: ${mtd['net_sales']:,.2f} on {mtd['orders']} orders")
    else:
        print("  MTD: (not provided; scaffold will estimate via March ratio)")


if __name__ == "__main__":
    main()
