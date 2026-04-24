---
name: craft-report
description: Craft a beautiful, brand-aligned MTD performance report for a DTC client — Meta + Google + Shopify data, MER vs floor/goal, net-new-reach audience health, what-worked/didn't narrative, deployed as a per-client Next.js microsite on Vercel. Conversational pipeline — asks the operator for confirmation at each stage. Use when the operator says "build a report", "MTD report", "monthly report", or "craft a report for {client}".
---

# Craft Report

## Purpose

Turn a month of raw performance data into a client-ready report that respects the client's brand. Same narrative and structure — MER gauge, daily trend, net-new-reach, worked/didn't, channel tables, one-table with deltas — applied to any client in the repo.

Each report is a fresh Next.js app at `apps/mtd-reports/{app-slug}-{YYYY-MM}/`, deployed to its own Vercel URL.

## When to use

- The operator asks for a MTD report for a client.
- End-of-month or mid-month performance check-in.
- Biweekly recurring client report (pair with `/schedule`).

## Arguments

`$ARGUMENTS`: optional slug and flags.

```
/craft-report                          → ask which client + ask for any missing inputs
/craft-report acme_brand               → run for that slug, current MTD through today
/craft-report pp_primal_path --month 2026-03 --as-of 2026-03-31   → run for a specific month
/craft-report ts_twelve_south --local  → scaffold + build, skip Vercel deploy
/craft-report --dry                    → pull data only, don't scaffold or deploy
```

## Flags

- `--month YYYY-MM` — report month (default: current month)
- `--as-of YYYY-MM-DD` — data cutoff date (default: today)
- `--local` — scaffold and `npm run build`, skip Vercel deploy
- `--preview` — deploy to Vercel preview URL (not prod)
- `--dry` — pull Meta + Google data only, skip scaffolding
- `--reset` — wipe and rebuild the `apps/mtd-reports/{slug}-{month}/` directory

## The conversational pipeline

This skill is interactive by design. Don't race through it. Each stage confirms with the operator before proceeding.

### Stage 0 — Bootstrap

1. Read `clients/{slug}/client.json`. If no slug supplied, list active clients and ask which one.
2. Resolve `report-month` and `as-of`. If month is current, `as-of` defaults to today.
3. Show the operator a one-line plan:

> "Crafting the April 2026 MTD report for {Client Name}, data through 2026-04-24. I'll pull Meta + Google, read the Shopify CSV, scrape the site for brand tokens, and scaffold a fresh Next.js app at apps/mtd-reports/{slug}-2026-04. OK to proceed?"

Wait for confirmation.

### Stage 1 — Brand detection (fast, non-blocking)

Run `extract_brand.py` to grep the client's website for font-family + accent color.

```bash
python3 .claude/skills/craft-report/scripts/extract_brand.py {slug} --report-month {YYYY-MM}
```

Write output to `clients/{slug}/mtd-reports/{YYYY-MM}/data/brand.json`.

Present findings to the operator:

> "Detected `Plus Jakarta Sans` font from the site. Accent color inferred as #7A825F (sage). Using a light-mode palette with warm off-white bg, charcoal text, sage primary, red only for under-floor alerts. Override the font or any color before I scaffold?"

Accept overrides; re-run `extract_brand.py` with `--override-font "Font Name"` if needed, or hand-edit `brand.json`.

### Stage 2 — Credentials + Google Ads discovery

Meta: `FB_ACCESS_TOKEN` from root `.env` + `fb_ad_account_id` from `clients/{slug}/configs/fb_ads.json`. If missing, ask operator.

Google: `GOOGLE_ADS_CUSTOMER_ID` from `clients/{slug}/credentials/secrets.env`. If missing:

1. Tell the operator Google Ads customer ID is missing.
2. Offer to list all customers under the MMS MCC so they can pick:
   ```bash
   python3 .claude/skills/craft-report/scripts/pull_google.py {slug} --list-customers
   ```
3. Let them choose. Persist the chosen ID to `clients/{slug}/credentials/secrets.env` as `GOOGLE_ADS_CUSTOMER_ID=...`. If the file doesn't exist, create it.
4. If the operator confirms the client doesn't run Google Ads, proceed with `--skip-google` (write an empty `google.json`).

### Stage 3 — Data pull (parallel)

Run these in parallel — independent data sources:

```bash
python3 .claude/skills/craft-report/scripts/pull_meta.py   {slug} --report-month {YYYY-MM} --as-of {YYYY-MM-DD}
python3 .claude/skills/craft-report/scripts/pull_google.py {slug} --report-month {YYYY-MM} --as-of {YYYY-MM-DD}
```

Each writes `meta.json` / `google.json` to `clients/{slug}/mtd-reports/{YYYY-MM}/data/`.

If `--dry`, stop here and print a summary of what was pulled.

### Stage 4 — Shopify ingestion (operator-assisted)

Shopify API is NOT currently wired for this repo. The operator provides data:

**Historical history CSV** (trailing 12 months of monthly net sales). Ask:

> "I need the trailing 12 months of Shopify net sales for the MER trend. Export from Shopify Admin → Analytics → Reports → Sales → Total sales breakdown → group by Month → Last 12 months → Export CSV. Drop the file path in the chat, or paste the numbers."

Accept a path to a CSV, or if they paste rows, save them to `/tmp/{slug}-shopify-history.csv` first.

**Current month MTD snapshot** (for the MER gauge). Ask:

> "Now the April MTD numbers. Same report but set the range to Apr 1 – {as-of}. What are Net sales, Orders, and AOV? (You can just paste the row.)"

Parse or accept fields. Then:

```bash
python3 .claude/skills/craft-report/scripts/ingest_shopify.py {slug} \
  --history {path-to-csv} \
  --report-month {YYYY-MM} \
  --mtd-net 38195.16 --mtd-orders 93 --mtd-aov 428.06 \
  --mtd-range-label "Apr 1 – Apr 24, 2026"
```

If the operator can't get an MTD snapshot right now, omit `--mtd-*` flags — scaffold will estimate from the last closed month's Shopify-to-paid ratio and flag the number as an estimate in the UI.

### Stage 5 — Website health check (chat-only diagnostic)

Compare this month's funnel vs last month's same-window funnel. Read from the Meta data you already pulled — `meta.windows.mtd` and `meta.windows.lm_samewindow` have `lp_views`, `add_to_cart`, `initiate_checkout`, `view_content`, `purchases`.

Report in chat only (no changes to the site):

- LP-view rate (click → site loaded): did it fall? Site may be broken.
- View Content rate: product page engagement.
- ATC → IC pass-through: cart leak?
- Purchase rate of LP views: overall CVR.

If the operator says they shipped a site change this month, flag any significant deltas. Don't bake this into the report yet — keep the report focused on paid performance.

### Stage 6 — Narrative authoring (agent-authored)

This is the part that makes the report premium. Look at:

- Top ad-sets by spend from `meta.adsets` — sort by spend descending, take top 5–6
- Top campaigns from `google.campaigns`
- Their ROAS, their share of total Meta spend, their recent performance

Write a narrative JSON at `clients/{slug}/mtd-reports/{YYYY-MM}/narrative.json` with this shape:

```json
{
  "worked": [
    {
      "channel": "Meta",
      "name": "4.11.26_JD_FLEXIBLEADS_ECON101_OK",
      "friendly": "Econ 101 Flexible Ads (launched Apr 11)",
      "spend": 1107.68, "revenue": 7158.80, "roas": 6.46, "purchases": 14,
      "note": "Human-readable context — what this is, why it worked, what's next."
    }
  ],
  "didnt_work": [ ... ],
  "shopify_mtd_note": "Optional override for the Shopify methodology footer"
}
```

Rules for writing notes (read these before every report):
- **Lead with the issue when MER is under 2.5×.** Don't spin.
- **Never use phrases like "honest read" or "being transparent"** — implies prior dishonesty.
- **MER = Shopify ÷ paid spend.** Paid-attributed revenue is platform-reported and double-counts cross-channel overlap — call it "paid-attributed" when you reference it, never "MER".
- **Respect the client's tone.** Look at `clients/{slug}/brand-guidelines/*.md` before writing. Every client has different brand voice guidelines — read them and write in that tone.
- **Quantify. Avoid adjectives.** "$7.7K at 1.71× ROAS" not "underperforming badly."
- **Include the fix for losers.** "Needs refresh" or "budget should shift" — not just "bad."

Present the draft narrative to the operator in chat. They edit. Save the final version.

### Stage 7 — Scaffold

```bash
python3 .claude/skills/craft-report/scripts/scaffold_report.py {slug} \
  --report-month {YYYY-MM} \
  --narrative clients/{slug}/mtd-reports/{YYYY-MM}/narrative.json
```

Creates / rebuilds `apps/mtd-reports/{app-slug}-{YYYY-MM}/` with:
- `src/lib/data.ts` — all numbers, typed, from the JSON files
- `src/app/globals.css` — CSS vars injected from `brand.json`
- `src/app/layout.tsx` — Google Fonts stylesheet link
- `package.json` — name scoped to this client+month
- Everything else copied from `_template/`

### Stage 8 — Build

```bash
cd apps/mtd-reports/{app-slug}-{YYYY-MM}
npm install    # first time only
npm run build
```

If build fails, read the error, fix it (usually a missing field in narrative or a type mismatch), re-run scaffold, rebuild. Don't deploy a broken build.

### Stage 9 — Deploy (or skip if --local)

```bash
bash .claude/skills/craft-report/scripts/deploy_vercel.sh {slug} {YYYY-MM}
```

Writes the final URL to `clients/{slug}/mtd-reports/{YYYY-MM}/site-url.txt`.

### Stage 10 — Summary

Print to operator:

> "Report deployed.
> Client: {Client name}
> Month: {YYYY-MM}
> Blended MER: {X.XX}x ({above/below} 2.5× floor)
> Top winner: {friendly name} — {X.XX}x
> Biggest drag: {friendly name} — {X.XX}x
> URL: {vercel URL}
> Local: apps/mtd-reports/{app-slug}-{YYYY-MM}/"

Then offer `/schedule` for a recurring cadence.

## Report structure (fixed)

The template renders these sections in this order:

1. **Hero** — client + title + date; main MER headline with floor gap
2. **MER gauge** — visual indicator, sage when above floor, red when under
3. **KPI row** — paid spend, paid-attributed revenue, MER, last-7-day MER
4. **Three takeaways** — structured as "the state / the trend / the biggest lever"
5. **Shape of the month** — daily blended ROAS with 7-day rolling + floor/goal lines
6. **Audience health** — Net New Reach stacked bars + % line
7. **MER in context** — 13-month MER trend vs floor/goal
8. **What worked / didn't** — ad-set / campaign breakdown with notes
9. **Channel mix** — spend share / revenue share / ROAS head-to-head
10. **Meta table** + **Google table** — per-window detail with deltas on ROAS
11. **Week-over-week** — last 7 days vs prior 7 days
12. **Shopify trend** — 12-month net sales bars + MTD partial bar
13. **One table** — transposed: metrics as rows, windows as columns, April MTD is the baseline
14. **Footer**

Do NOT reorganize these per-report. The ordering is part of the narrative — state → shape → cause (reach) → context → detail → action.

## Critical rules

- **Every number on the site maps to a field in `data.ts`.** If the agent needs to add a figure, add it to the right JSON pull, regenerate the narrative, re-scaffold. Never hardcode.
- **MER uses Shopify.** If Shopify MTD isn't in hand, estimate + flag as estimate. The hero number must clearly use Shopify, not pixel revenue.
- **Light mode only.** The template is light mode. Don't branch for dark-mode clients.
- **Never commit `apps/mtd-reports/*/node_modules` or `.next` or `.vercel`.** Add to `.gitignore`.
- **Per-client isolation.** Two clients must never share a build. If the scaffold script ever reads `/apps/mtd-reports/{other-slug}-*/`, that's a bug.
- **Vercel deploys are hard to reverse in the audit trail.** On a client's first deploy, confirm before running. Subsequent redeploys are safe (they update the same project).

## Setup (one-time, per teammate)

1. Node 20+ and `npm`, via nvm is fine.
2. `npm install vercel -g` (or let the script use `npx -y vercel@latest`).
3. `vercel login` — OAuth through the browser. `vercel whoami` should show your handle.
4. Root `.env` must have `FB_ACCESS_TOKEN`.
5. At least one client's `secrets.env` with Google Ads OAuth creds (`GOOGLE_ADS_DEVELOPER_TOKEN`, `GOOGLE_ADS_CLIENT_ID`, `GOOGLE_ADS_CLIENT_SECRET`, `GOOGLE_ADS_REFRESH_TOKEN`, `GOOGLE_ADS_MANAGER_ID`). The skill auto-borrows shared OAuth pieces from other clients when the target client's secrets.env is missing them.

See `.claude/skills/craft-report/README.md` for teammate onboarding.
