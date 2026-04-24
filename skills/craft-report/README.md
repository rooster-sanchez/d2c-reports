# craft-report — teammate onboarding

A reusable skill for producing MTD performance reports for any DTC client in this repo. Re-skinned per client's brand, deployed to its own URL.

**Slash command:** `/craft-report [slug] [flags]`
**Skill spec:** [SKILL.md](SKILL.md)
**Template:** [`_template/`](_template/)

## What it does

Produces a Next.js microsite with:

- **MER gauge** — blended MER vs floor (default 2.5×) and goal (default 3.0×)
- **13-month MER trend** — Shopify net sales ÷ total paid spend per month
- **Shape of the month** — daily paid-attributed ROAS with 7-day rolling avg
- **Net New Reach** — audience health, Meta's new-vs-repeat reach by month
- **What worked / didn't** — ad-set and campaign detail with context notes
- **Channel breakdown** — Meta + Google tables with period-over-period deltas
- **One table** — transposed baseline-vs-comparison layout across windows
- **Shopify trend** — 12-month net sales bars + current MTD bar

## Quickstart

### First time only

1. **Node 20+** via nvm or directly:
   ```
   nvm install 20 && nvm use 20
   ```

2. **Vercel auth** (one-time per machine):
   ```
   npm i -g vercel
   vercel login    # browser OAuth
   vercel whoami   # verify
   ```

3. **Root `.env` must have:**
   - `FB_ACCESS_TOKEN` — Meta Graph API token

4. **At least one client must have Google Ads OAuth creds** in `clients/{any-slug}/credentials/secrets.env`:
   - `GOOGLE_ADS_DEVELOPER_TOKEN`
   - `GOOGLE_ADS_CLIENT_ID`
   - `GOOGLE_ADS_CLIENT_SECRET`
   - `GOOGLE_ADS_REFRESH_TOKEN`
   - `GOOGLE_ADS_MANAGER_ID`

   The skill auto-borrows these shared OAuth pieces from other clients when the target client doesn't have them — only the per-client `GOOGLE_ADS_CUSTOMER_ID` needs to be client-specific.

### Running a report

```
/craft-report ts_twelve_south
```

Claude walks you through 10 stages, asking for confirmation at each step:

1. Bootstrap — confirms the client + month
2. Brand detection — scrapes the site for font + accent color, shows you what it found
3. Credentials — asks for the Google Ads customer ID if not saved
4. Data pull — Meta + Google APIs in parallel (~60–90 seconds)
5. Shopify ingestion — asks for the 12-month CSV and the MTD snapshot
6. Website health check — diagnostic comparison of LP views / ATC / IC / purchases
7. Narrative authoring — drafts "what worked / didn't" notes, you edit
8. Scaffold — generates the Next.js app under `apps/mtd-reports/{app-slug}-{YYYY-MM}/`
9. Build — `npm run build`
10. Deploy — Vercel URL

## Typical Shopify export steps

From Shopify Admin:

1. **12-month monthly CSV** (for the MER trend denominator)
   - Analytics → Reports → Sales → Total sales breakdown
   - Group by: Month
   - Date range: Last 12 full months (don't include the current partial month)
   - Filter: "Tests" excluded if you have one
   - Export as CSV → save path and paste into chat

2. **MTD snapshot** (one row, for the hero MER gauge)
   - Same report, same grouping, Date range: current month-start → today
   - You need: **Net sales**, **Orders**, **AOV** (all visible in the UI)

Paste the values into chat; Claude normalizes them.

## Overriding brand detection

If the font detection picks the wrong font or you don't like the auto-palette:

- **Font override:** in Stage 1, say "use Inter instead" — Claude will re-run with `--override-font "Inter"`.
- **Color overrides:** tell Claude the hex you want for accent/alert/success. It'll edit `brand.json` before scaffold.
- **Full custom palette:** edit `clients/{slug}/mtd-reports/{YYYY-MM}/data/brand.json` by hand and re-run scaffold only (`python3 .claude/skills/craft-report/scripts/scaffold_report.py {slug} --report-month {YYYY-MM}`).

## Setting different MER targets per client

Default is 2.5× floor / 3.0× goal. If a client has different economics (tighter margins = higher floor, new DTC = lower), save a memory entry like:

```
project_{slug}_mer_targets.md
```

with the targets and reasoning. Future `/craft-report` runs will read the memory and use those values. (Today the values are hardcoded in `scaffold_report.py` as `MER_FLOOR` / `MER_GOAL` — we'll pull these from client config in v2.)

## Flags cheatsheet

```
/craft-report {slug}                          # current month, deploy to prod
/craft-report {slug} --month 2026-03          # a specific month
/craft-report {slug} --as-of 2026-03-15       # cutoff data at a specific date
/craft-report {slug} --local                  # scaffold + build, no deploy
/craft-report {slug} --preview                # deploy to preview URL
/craft-report {slug} --dry                    # pull data only, no scaffold
/craft-report {slug} --reset                  # wipe and rebuild the app dir
```

## File layout

```
.claude/skills/craft-report/
├── SKILL.md              # the conversational pipeline spec Claude reads
├── README.md             # this file — for humans
├── _template/            # the Next.js app template
│   ├── package.json
│   ├── next.config.ts
│   ├── tsconfig.json
│   ├── postcss.config.mjs
│   └── src/
│       ├── app/
│       ├── components/
│       └── lib/
└── scripts/
    ├── pull_meta.py       # Meta API data pull (all windows, daily, monthly, reach, adsets)
    ├── pull_google.py     # Google Ads API data pull (+ MCC customer discovery)
    ├── extract_brand.py   # Font + palette detection from the client's website
    ├── ingest_shopify.py  # CSV → normalized shopify.json
    ├── scaffold_report.py # Builds the per-client Next.js app
    └── deploy_vercel.sh   # Vercel deploy wrapper

clients/{slug}/mtd-reports/{YYYY-MM}/
├── data/
│   ├── meta.json        # Meta API output
│   ├── google.json      # Google Ads API output
│   ├── shopify.json     # Ingested Shopify data
│   └── brand.json       # Detected brand tokens
├── narrative.json       # Agent-authored "what worked / didn't" (you edit this)
└── site-url.txt         # Deployed Vercel URL

apps/mtd-reports/{app-slug}-{YYYY-MM}/    # the built app (deploy artifact)
```

## Running individual stages manually

Sometimes you only want to re-scaffold after a narrative edit, or re-deploy after a fix. Each stage is a standalone script:

```bash
# Data pull only
python3 .claude/skills/craft-report/scripts/pull_meta.py {slug}
python3 .claude/skills/craft-report/scripts/pull_google.py {slug}
python3 .claude/skills/craft-report/scripts/extract_brand.py {slug} --report-month 2026-04

# Ingest a CSV the operator exported from Shopify
python3 .claude/skills/craft-report/scripts/ingest_shopify.py {slug} \
  --history ~/Downloads/shopify-12mo.csv \
  --report-month 2026-04 \
  --mtd-net 38195.16 --mtd-orders 93 --mtd-aov 428.06

# Scaffold and build
python3 .claude/skills/craft-report/scripts/scaffold_report.py {slug} --report-month 2026-04
cd apps/mtd-reports/{app-slug}-2026-04 && npm install && npm run build

# Deploy
bash .claude/skills/craft-report/scripts/deploy_vercel.sh {slug} 2026-04
```

## Troubleshooting

**"No fb_ad_account_id found for {slug}"** — Add `fb_ad_account_id` to `clients/{slug}/configs/fb_ads.json`.

**"Missing Google Ads OAuth creds"** — Copy the shared OAuth block from any existing client that has it (e.g. `clients/ts_twelve_south/credentials/secrets.env`) into the target client's `secrets.env`. Only `GOOGLE_ADS_CUSTOMER_ID` is client-specific; the other 4 fields are shared MCC OAuth creds.

**"No GOOGLE_ADS_CUSTOMER_ID"** — Run `python3 .claude/skills/craft-report/scripts/pull_google.py {slug} --list-customers` to see all accounts under the MCC. Pick the right one, add it to `clients/{slug}/credentials/secrets.env`.

**Build fails with type errors** — Almost always means a field in the narrative JSON doesn't match the `WorkItem` schema. Check `_template/src/lib/data.ts` for the type definition and compare against the narrative you authored.

**Vercel deploy fails with "Not authenticated"** — Run `vercel login` or add `VERCEL_TOKEN` to root `.env`.

**Chart looks empty** — Check that `meta.json` / `google.json` actually have `daily` / `monthly` / `reach_history` populated. If Meta returned empty arrays, something's up with the ad account or date range.

## Scheduling recurring reports

Pair with `/schedule` for biweekly delivery:

```
/schedule "Every second Thursday, run /craft-report acme_brand"
```

The scheduled agent will re-pull data + re-scaffold + re-deploy, producing a fresh URL each cycle. Heads up: the agent will need the Shopify data — best to have the client email the CSV on a schedule, or wire up the Shopify API (TODO).

## Known limitations (v1)

- **Shopify is manual.** The CSV ingestion flow works, but we don't pull from Shopify API yet. Wiring it is the single biggest UX win remaining.
- **MER targets are hardcoded.** 2.5× / 3.0× are baked into `scaffold_report.py`. v2 will read from `clients/{slug}/configs/mer_targets.json`.
- **Narrative auto-gen is basic.** The Python fallback just sorts ad-sets by ROAS. The agent should always author the real narrative — don't ship the auto version to a client.
- **Font detection is light.** Plain grep of CSS. Will miss custom-hosted fonts not on Google Fonts. Override manually when that happens.

Feedback in `#ops`. Contribute fixes directly to `.claude/skills/craft-report/`.
