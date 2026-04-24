# craft-report

> A Claude Code skill that crafts beautiful, brand-aligned monthly performance reports for DTC e-commerce clients — pulls Meta Ads + Google Ads + Shopify data, computes real MER against a floor, deploys as a Next.js microsite on Vercel. **Conversational**, not a button.

**What it replaces:** that thing where you spend 4 hours every month copy-pasting numbers from three dashboards into a Google Doc that nobody reads.

---

## What you get

A per-client, per-month Next.js microsite deployed to its own Vercel URL. Every report has the same fourteen sections, automatically populated from live data:

| Section | Source |
|---|---|
| **Hero + MER gauge** — blended MER vs floor/goal, honest when under target | Shopify ÷ paid spend |
| **Top-of-mind takeaways** — three cards: state, trend, biggest lever | Agent-authored |
| **Shape of the month** — daily ROAS + 7-day rolling avg | Meta + Google daily |
| **Audience health (Net New Reach)** — stacked bars, % new line | Meta Graph (reach + cumulative) |
| **MER trend** — 13 months vs floor/goal | Shopify CSV + paid spend |
| **What worked / didn't** — ad-set & campaign detail with context notes | Meta ad-sets + Google campaigns |
| **Channel mix** — spend share / revenue share / ROAS head-to-head | Meta + Google |
| **Meta table + Google table** — every window, with ROAS deltas | Meta + Google insights |
| **Week over week** — last 7 vs prior 7 | Meta + Google |
| **Shopify trend** — trailing 12 months + MTD partial bar | Shopify CSV + MTD snapshot |
| **The One Table** — transposed metric × window, baseline-vs-comparison | All of it |

Brand-adapted every time:

- **Fonts** are pulled from the client's website (grep the theme CSS, match to Google Fonts).
- **Accent color** is inferred from the site's primary/CTA color (falls back to a calm sage default).
- **Tone** of the "what worked / didn't" notes is written by Claude against the client's brand guidelines.

Screenshots are in [docs/screenshots](docs/screenshots/).

## The philosophy baked in

Agency reports are often dishonest by design. They lead with year-over-year revenue growth and bury the efficiency story. This skill takes the opposite stance:

- **MER uses Shopify revenue, not pixel-attributed revenue.** Platform attribution (Meta pixel + Google conversions) double-counts overlapping touchpoints. MER is the only paid-media efficiency metric the client's accountant will agree with.
- **Floor (default 2.5×) and goal (default 3.0×) are visible in every chart.** If MER is below floor, the hero leads with the gap.
- **Never spin.** The skill prompt explicitly tells Claude to avoid words like "honest" or "transparent" because they imply prior dishonesty. Just state numbers, give the fix.
- **Net new reach is a leading indicator of MER compression.** When net-new-reach share falls, ROAS usually follows by 30–60 days. The chart connects those dots visibly.

## Who this is for

- **DTC growth teams** running Meta + Google Ads + Shopify, who need a repeatable monthly report cycle
- **Fractional CMOs and agencies** who want to replace ad-hoc Google Docs with a real deliverable
- **Claude Code users** who want to see a non-trivial skill — APIs + site generation + Vercel deploy — wired end-to-end

Not for: D2C businesses that only run one channel, or teams where Shopify is the primary ad platform.

## How it works (architecture)

```
┌─ Meta Graph API ──────────┐
│ • windows (MTD, WoW, YoY) │     scaffold_report.py             ┌─ Next.js app ─┐
│ • daily                   │           ↓                         │ src/lib/data.ts│
│ • adsets                  │    ┌──────────────┐                 │ src/app/*.css  │
│ • monthly + reach         │────┤  _template/  │  ──────────→    │ components/    │
└───────────────────────────┘    │  (Next.js)   │   fill with     │ deployed to    │
┌─ Google Ads API v23 ──────┐    └──────────────┘   real data     │ Vercel         │
│ • same windows            │           ↑                         └────────────────┘
│ • daily                   │           │
│ • campaigns               │    brand.json (font + palette)
└───────────────────────────┘    shopify.json (CSV + MTD snapshot)
```

Every stage is a standalone script. The orchestration lives in [`skills/craft-report/SKILL.md`](skills/craft-report/SKILL.md) — Claude reads that file and walks the operator through a 10-stage conversational pipeline, asking for confirmation at each gate.

## Quickstart

### 0. Prerequisites

- **Claude Code** (or any Claude-Agent-SDK-compatible setup that reads `.claude/skills/` and `.claude/commands/`)
- **Python 3.9+** with `requests` and `python-dotenv` (`pip install requests python-dotenv`)
- **Node 20+** via nvm or direct
- **Vercel CLI** — `npm i -g vercel && vercel login`
- **Meta Graph API** long-lived token with `ads_read` scope
- **Google Ads API** developer token + OAuth client (optional — skip cleanly if the client doesn't run Google)
- **Shopify** — a CSV export is fine; API optional

### 1. Install into your workspace

```bash
cd /path/to/your/workspace
bash <(curl -sSL https://raw.githubusercontent.com/{your-username}/craft-report/main/install.sh)
```

Or manually:

```bash
git clone https://github.com/{your-username}/craft-report.git /tmp/craft-report
mkdir -p .claude/skills .claude/commands
cp -R /tmp/craft-report/skills/craft-report .claude/skills/
cp /tmp/craft-report/commands/craft-report.md .claude/commands/
```

### 2. Add credentials

Copy [.env.example](.env.example) to `.env` at your workspace root:

```
FB_ACCESS_TOKEN=EAAG...
GOOGLE_ADS_DEVELOPER_TOKEN=abc...
GOOGLE_ADS_CLIENT_ID=....apps.googleusercontent.com
GOOGLE_ADS_CLIENT_SECRET=GOCSPX-...
GOOGLE_ADS_REFRESH_TOKEN=1//03...
GOOGLE_ADS_MANAGER_ID=241-140-5250
VERCEL_TOKEN=             # optional; OAuth via `vercel login` works too
```

### 3. Set up a client directory

The skill expects client data at `clients/{slug}/`. Minimum:

```
clients/
└── acme_brand/
    ├── client.json                       # name, slug, website
    ├── configs/
    │   └── fb_ads.json                   # fb_ad_account_id
    └── credentials/
        └── secrets.env                   # GOOGLE_ADS_CUSTOMER_ID (optional)
```

Example `client.json`:
```json
{
  "name": "Acme Brand",
  "slug": "acme_brand",
  "website": "https://acmebrand.com"
}
```

### 4. Run

Inside Claude Code:

```
/craft-report acme_brand
```

Claude walks you through 10 stages, asking for confirmation at each step. Approx. 10 minutes total, most of it waiting on API pulls and you pasting Shopify CSVs.

End result: a live Vercel URL like `https://mtd-acme-brand-2026-04.vercel.app` that you send to the client.

## The 10 stages

1. **Bootstrap** — confirm client + month
2. **Brand detection** — scrape the site for font + accent color
3. **Credentials** — if Google customer ID missing, list MCC accounts and pick
4. **Data pull** — Meta + Google APIs in parallel
5. **Shopify ingestion** — ask for monthly CSV + MTD net-sales snapshot
6. **Website health check** — diagnostic of LP views, ATC, IC, purchases (chat only)
7. **Narrative authoring** — Claude drafts "what worked / didn't" notes, you edit
8. **Scaffold** — generate the Next.js app at `apps/mtd-reports/{slug}-{YYYY-MM}/`
9. **Build** — `npm run build` to verify
10. **Deploy** — Vercel, URL saved to `clients/{slug}/mtd-reports/{YYYY-MM}/site-url.txt`

Full spec at [`skills/craft-report/SKILL.md`](skills/craft-report/SKILL.md).

## Customizing

**Different MER targets per client?** Edit `MER_FLOOR` and `MER_GOAL` at the top of [`skills/craft-report/scripts/scaffold_report.py`](skills/craft-report/scripts/scaffold_report.py). v2 will read these from a per-client config.

**Different sections or ordering?** Edit the template at [`skills/craft-report/_template/src/app/page.tsx`](skills/craft-report/_template/src/app/page.tsx). All future reports inherit the change.

**Different palette default?** Edit `default_palette()` in [`skills/craft-report/scripts/extract_brand.py`](skills/craft-report/scripts/extract_brand.py).

**Adding a new chart/component?** Drop it into `_template/src/components/`, import it in `page.tsx`, add the data field to `data.ts` and the pull logic to `pull_meta.py` or `pull_google.py`. Re-run `/craft-report`.

## Limitations (v0.1)

- **Shopify is manual.** CSV ingestion works, Shopify API is a TODO. You'll paste a CSV and 3 numbers each run.
- **MER targets hardcoded.** 2.5 / 3.0 live in the scaffold script. Per-client overrides via memory works today; per-client config file is v0.2.
- **Font detection is grep-based.** Works for most Shopify themes that use Google Fonts. Custom-hosted webfonts need manual override.
- **Vercel-only.** Deploys to Vercel. Netlify / Cloudflare Pages would be a fork.
- **English only.** Copy is English throughout.

## FAQ

**Does this work without Google Ads?** Yes. If the client doesn't run Google, the skill accepts `--skip-google` and writes a zero-filled `google.json`. Report still renders.

**Does this work without Shopify?** Partially. MER needs store revenue to be meaningful. Without Shopify you'd have to use pixel-attributed revenue, which is not the same thing — the template has an "estimated" indicator for that case.

**Can I run it from Claude Agent SDK outside Claude Code?** The Python scripts run anywhere. The conversational orchestration (`SKILL.md`) is designed for Claude Code's skill system, but you could port the pipeline to a Python Agent with ~50 lines of glue.

**Can I fork and change the report structure?** That's literally what this is for. The template and orchestration are both in this repo.

**What if my font isn't on Google Fonts?** Pass `--override-font "Your Font"` to `extract_brand.py` or hand-edit `brand.json`. The template's `layout.tsx` reads the `google_fonts_href` field — change it to a different CDN if needed.

## Credits

Built by [Rooster Sanchez](https://github.com/rooster-sanchez). If this skill saves you time, the best thank-you is to tell someone about it or star the repo.

Follow the YouTube channel → **{YOUR YOUTUBE URL}**
Agency: **{YOUR AGENCY URL}**

## License

[MIT](LICENSE).
