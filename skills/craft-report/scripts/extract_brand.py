#!/usr/bin/env python3
"""
Extract brand visual identity from a client's website.

Detects:
  - Font family (grep @font-face / font-family from rendered CSS)
  - Google Fonts reference if present
  - A starter palette with reasonable light-mode defaults derived from the
    detected brand color (or falls back to a sage/charcoal palette)

Outputs a brand.json used by scaffold_report.py to inject CSS variables,
Google Fonts links, and the font-family string.

Usage:
  python3 scripts/extract_brand.py <slug> [--url https://...] [--override-font "Font Name"]

The override flags let the operator pin values after the conversational pass
in the main agent ("Use this palette, or override?").
"""

from __future__ import annotations

import argparse
import json
import re
import sys
from pathlib import Path

import requests

SCRIPT_DIR = Path(__file__).resolve().parent
WORKSPACE_ROOT = SCRIPT_DIR.parents[3]

# Known Google Fonts we can load via a stylesheet link (canonical Google Fonts
# names). Keys are lowercase for matching.
GOOGLE_FONTS_KNOWN = {
    "plus jakarta sans", "inter", "poppins", "manrope", "dm sans", "work sans",
    "nunito", "nunito sans", "montserrat", "raleway", "lato", "open sans",
    "source sans 3", "source sans pro", "figtree", "outfit", "karla",
    "playfair display", "fraunces", "instrument serif", "dm serif display",
    "libre franklin", "ibm plex sans", "ibm plex serif", "space grotesk",
    "be vietnam pro", "rubik", "sora", "urbanist", "hind", "epilogue",
    "jost", "mulish", "pt sans", "archivo", "roboto", "roboto flex",
    "roboto condensed", "oswald", "bitter",
}


def fetch_html(url: str) -> str:
    r = requests.get(url, timeout=30, headers={"User-Agent": "antigravity-craft-report/1.0"})
    r.raise_for_status()
    return r.text


def detect_font(html: str) -> tuple[str, str | None]:
    """Return (canonical_font_family, google_fonts_href_or_None)."""
    # 1) Explicit Google Fonts stylesheet link
    gf_match = re.search(
        r'fonts\.googleapis\.com/css2\?family=([^&"\']+)', html, re.IGNORECASE
    )
    if gf_match:
        fam_raw = gf_match.group(1)
        name = fam_raw.split(":")[0].replace("+", " ")
        return name, fam_raw

    # 2) Most common font-family declaration (first non-system value wins)
    declarations = re.findall(
        r"font-family\s*:\s*([^;{}]+)", html, re.IGNORECASE
    )
    for d in declarations:
        for token in d.split(","):
            clean = token.strip().strip("'").strip('"').strip()
            if not clean:
                continue
            low = clean.lower()
            if low in ("inherit", "initial", "unset", "sans-serif", "serif", "monospace",
                      "system-ui", "-apple-system", "blinkmacsystemfont", "segoe ui",
                      "roboto", "helvetica neue", "helvetica", "arial"):
                # Keep looking for something more branded. Roboto/Helvetica fall
                # through here because they're often fallback anchors, not the
                # branded font itself.
                continue
            return clean, None

    return "Inter", None  # safe default


def build_google_fonts_href(font_name: str) -> str:
    """Build a reasonable Google Fonts stylesheet URL for the detected font."""
    family_param = font_name.replace(" ", "+")
    # Pull a full weight range so the template's usages all resolve
    return (
        f"https://fonts.googleapis.com/css2?family={family_param}:wght@300;400;500;600;700;800"
        "&family=JetBrains+Mono:wght@400;500;600&display=swap"
    )


def detect_accent_color(html: str) -> str | None:
    """Try to find a dominant brand color from inline CSS. Best-effort."""
    # Look for --primary / --accent / --brand tokens in CSS vars
    patterns = [
        r"--(?:primary|accent|brand)(?:-color|-500|-main)?\s*:\s*(#[0-9A-Fa-f]{3,8})",
        r"\.(?:btn-primary|button-primary|cta)[^{}]*\{[^{}]*background(?:-color)?\s*:\s*(#[0-9A-Fa-f]{3,8})",
    ]
    for p in patterns:
        m = re.search(p, html)
        if m:
            return m.group(1)
    return None


def default_palette(accent_hex: str | None) -> dict:
    """Return a brand palette. Always light-mode, always readable.
    Sage + charcoal is our elegant default; accent slots in where available."""
    sage = accent_hex or "#7A825F"
    return {
        "bg":          "#F7F5F1",
        "bg_deep":     "#EEEAE2",
        "surface":     "#FFFFFF",
        "surface_2":   "#FAF8F4",
        "border":      "#E5E1D8",
        "border_strong": "#CFC8B9",
        "text_primary": "#1F1F1F",
        "text_secondary": "#4A4A47",
        "text_tertiary":  "#8A8680",
        "sage":       sage,
        "sage_deep":  "#5A6345",
        "sage_soft":  "#E2E3D6",
        "river":      "#3E6B73",
        "sand":       "#C9B896",
        "alert":      "#C5392B",
        "alert_soft": "#F8E3E0",
        "success":    "#4A7C59",
        "success_soft": "#DCE8DE",
        "warning":    "#B77E2A",
        "warning_soft": "#F3E8D5",
    }


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("slug")
    ap.add_argument("--url", help="Override site URL (defaults to client.json website)")
    ap.add_argument("--override-font", help="Pin font family explicitly")
    ap.add_argument("--report-month", default=None)
    args = ap.parse_args()

    client_json = WORKSPACE_ROOT / "clients" / args.slug / "client.json"
    if not client_json.exists():
        raise SystemExit(f"No client.json for {args.slug}")
    with open(client_json) as f:
        client = json.load(f)

    url = args.url or client.get("website")
    if not url:
        raise SystemExit(f"No website URL for {args.slug}")

    print(f"Scraping {url} ...")
    html = fetch_html(url)
    font_name, gf_href = detect_font(html)
    if args.override_font:
        font_name = args.override_font
        gf_href = None

    google_fonts_url = None
    if font_name.lower() in GOOGLE_FONTS_KNOWN:
        google_fonts_url = build_google_fonts_href(font_name)
    elif gf_href:
        # Reconstruct a usable URL from the detected href param
        google_fonts_url = (
            f"https://fonts.googleapis.com/css2?family={gf_href}"
            "&family=JetBrains+Mono:wght@400;500;600&display=swap"
        )
    else:
        google_fonts_url = build_google_fonts_href("Inter")
        font_name = "Inter"

    accent_hex = detect_accent_color(html)
    palette = default_palette(accent_hex)

    brand = {
        "slug": args.slug,
        "client_name": client.get("name", args.slug),
        "website": url,
        "font_family": font_name,
        "google_fonts_href": google_fonts_url,
        "palette": palette,
        "detected_accent": accent_hex,
    }

    report_month = args.report_month
    if report_month:
        out_dir = WORKSPACE_ROOT / "clients" / args.slug / "mtd-reports" / report_month / "data"
    else:
        out_dir = WORKSPACE_ROOT / "clients" / args.slug / "mtd-reports" / "_brand"
    out_dir.mkdir(parents=True, exist_ok=True)
    path = out_dir / "brand.json"
    with open(path, "w") as f:
        json.dump(brand, f, indent=2)

    print(f"Wrote {path}")
    print(f"  Font: {font_name}")
    print(f"  Accent: {accent_hex or '(using sage default)'}")


if __name__ == "__main__":
    main()
