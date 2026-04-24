# Changelog

## v0.1.0 — 2026-04-24

Initial public release.

**Ships:**
- 10-stage conversational pipeline (`SKILL.md`)
- Meta Graph API pull — 6 comparison windows, daily, ad-sets, 13 months monthly, monthly + cumulative reach for Net New Reach
- Google Ads API v23 pull — same 6 windows, daily, campaign breakdown, monthly history; MCC customer discovery
- Brand extraction — font detection (matches 40+ Google Fonts families), accent color inference
- Shopify CSV ingestion — trailing 12-month history + MTD snapshot
- Scaffold script — generates a per-client Next.js app with all data and brand tokens injected
- Vercel deploy wrapper with OAuth or token support
- 12 chart components (MER gauge, daily trend, net new reach, 13-mo MER, WoW, channel mix, shopify trend, one-table, worked/didn't lists, channel tables)

**Known limitations:**
- Shopify is CSV-based. API integration is a TODO.
- MER floor/goal hardcoded in `scaffold_report.py` (defaults 2.5 / 3.0).
- Font detection is grep-based — custom webfonts need manual override.
- Vercel-only deploy. No Netlify / CF Pages yet.
