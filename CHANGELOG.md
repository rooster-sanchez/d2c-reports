# Changelog

## v0.2.0 — 2026-05-07

Deck-mode refresh. Reports are now designed to be walked through by a presenter, not read alone — the structure, voice rules, and component shape have all changed.

**New / restructured sections:**
- MER context chart (13-month revenue bars + MER line) replaces the old Shopify-trend + standalone-MER-trend split.
- 3 period cards (last year same month · last closed · current MTD) replace the old "Shape of the month" daily trend + first/second-half cards.
- Top Performers · Last 30 Days — 4 ad-level cards with image, format badge, ROAS dot.
- Creative insights — 2 strong bullets framed as creative-strategy reads (angle / persona / DNA / risk), not media-buying tactics.
- Channel detail accordion (Meta + Google tables) wraps the per-window detail; collapsed by default.
- Action plan — 3 title-only imperative priority cards.

**Strategic moves replace adset-level worked/didnt:**
- New `worked_moves` / `didnt_moves` arrays (Move type with `title`, `stat`, `detail`) feed the deck-mode WorkedLists. Legacy `worked` / `didnt_work` kept for back-compat.
- Voice rule: 2-3 high-level moves per side. Strategic, not tactical.

**Per-client floor + goal config:**
- Drop `clients/{slug}/configs/mtd_report.json` with `{ "mer_floor": 3.5, "mer_goal": 4.0 }`. Scaffold reads it automatically. Resolves the v0.1 hardcoded-targets limitation.

**Generic component params:**
- New scaffold-emitted exports: `mtd_label`, `mtd_days`, `prev_label`, `prev_days`, `meta.as_of`. Components no longer need per-report editing — labels like "April MTD" / "March close" derive from data.

**Blended ROAS bar = MER, not paid-attributed:**
- ChannelMixChart's "Blended" bar now uses `mtd_mer` (Shopify ÷ paid spend) so it matches the hero number. Previously used paid-attributed blended ROAS, which contradicted the headline.

**Other:**
- TopPerformers component added (was missing from v0.1).
- NetNewReachChart mini-stats now derived from `reach_history` instead of hardcoded.
- New `LESSONS.md` captures conventions: blended-is-MER rule, narrative.json schema, voice rules.
- New `deploy_vercel_rest.py` fallback for Vercel CLI hangs.

## v0.1.0 — 2026-04-24

Initial public release as `d2c-reports`.

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
