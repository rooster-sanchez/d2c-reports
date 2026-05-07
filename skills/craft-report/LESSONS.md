# /craft-report — Lessons & Conventions

Things that have bitten us, in order of frequency. Read this before running the skill — most of it is now codified in `scripts/scaffold_report.py` + `_template/`, but the conventions still need to be followed by the agent authoring the narrative.

## 1. Per-client MER floor lives in `clients/{slug}/configs/mtd_report.json`

The scaffold loads `{ mer_floor, mer_goal }` from this file. Defaults are `2.5 / 3.0` if the file is missing. When a client tells us their floor, persist it here — don't only set it in the rendered `data.ts`.

Format:
```json
{ "mer_floor": 2.5, "mer_goal": 3.0, "blended_mer_basis": "Shopify net sales ÷ paid spend (Meta + Google)" }
```

Floors are highly category-dependent — durables and high-AOV brands tend to sit lower (1.5–2.5×); high-margin DTC categories tend to sit higher (3–5×). Set per-client based on contribution-margin math, not a default.

## 2. The "Blended" bar in the ROAS chart is MER, not paid-attributed

`ChannelMixChart.tsx` (the three-card section: Spend mix · Revenue mix · ROAS) shows three bars: Meta · Google · Blended. Convention:

- Meta and Google bars = platform-reported (paid-attributed) ROAS — `meta_mtd.roas`, `google_mtd.roas`.
- **Blended bar = MER** (`mtd_mer` = Shopify ÷ paid spend), not `blended_mtd.roas`.

Why: the hero number at the top of the report is MER. If the Blended bar uses paid-attributed ROAS instead, the report contradicts itself (e.g. headline says 3.29× but the chart says 2.50×). The `_template` is wired correctly; if you ever copy this chart from somewhere else, double-check the Blended source.

## 3. The `monthly[]` export contains only **closed** months

`scaffold_report.py` filters out the partial current-month row when emitting `monthly[]`. So:
- `MERContextChart.tsx` must append a synthetic partial row from `mtd_shopify` + `mtd_mer` so the May/etc. bar shows up. The `_template` does this by default using a new `mtd_label` export.
- `last_closed = monthly[monthly.length - 1]` is the previous full closed month, never the current MTD.

## 4. Generic month labels are exported — do not hardcode "April MTD"

The scaffold emits these so components don't need per-report editing:
- `mtd_label` (e.g. `"May '26"`)
- `mtd_days` (e.g. `7`)
- `prev_label` (e.g. `"April"`)
- `prev_days` (e.g. `30`)
- `meta.as_of` (e.g. `"2026-05-07"`) — used by `TopPerformers` for the days-live calculation

If you find a hardcoded `"April"` / `"March"` / `"Apr 1–24"` in any component, replace it with these exports.

## 5. The deck-mode `WorkedLists` expects `worked_moves` / `didnt_moves`, not `worked` / `didnt_work`

The legacy ad-set-level `worked` / `didnt_work` arrays still exist in `data.ts` (back-compat), but the active deck-mode component reads `worked_moves` and `didnt_moves`, which are strategic-level moves with `{ title, stat, detail }` shape.

Operator voice for moves: **2-3 high-level strategic moves per side.** Not media-buying tactics. Not "cut adset X by 40%." Examples:
- "Google emerged as the efficiency anchor" / `stat: "4.0× ROAS · 24% of paid spend"`
- "Blended MER stayed below the 3.5 floor" / `stat: "3.3× MTD"`

## 6. Top Performers requires an ad-level Meta pull + image download

The scaffold emits an empty `top_performers` array if the narrative doesn't supply one. To populate it:

1. Pull top N Meta ads by spend for the last 30 days using an ad-level Insights query (level=ad, fields include creative + image_url). Save to `clients/{slug}/mtd-reports/{YYYY-MM}/data/top_ads.json`.
2. Download images to `apps/mtd-reports/{app-slug}-{YYYY-MM}/public/top-performers/ad{N}-{ad_id}.jpg`.
3. Skip ads where the image fetch returns < 1KB (Meta sometimes returns 9KB placeholder pixels for flex ads — pick the next ad with a real image).
4. Add `top_performers` and `top_performers_window` to `narrative.json` so the scaffold renders them.
5. Format detection: trust the ad-name pattern (`FLEXIBLEADS` / `FLEX` → "Flex Ad", `STATIC` → "Static", etc.) — the creative type returned by the Graph API is unreliable.

## 7. Creative insights are creative-strategy, not media-buying

`page.tsx` declares `creativeInsights: ReactNode[]`. **2 strong bullets is enough**, not 4. Each bullet is a `<strong>` lead-line + one short follow-up sentence. The bullets answer:
- What angle / desire is winning?
- What visual or messaging pattern carries?
- What does this tell us about the buyer persona?
- Where is the concentration risk?

Do NOT write things like "scale this, cap that, $X CPC" — that's media buying. The framing rule is in `craft-report/SKILL.md` under "Deck-mode language rules".

## 8. Priorities are imperatives, not tactics

`ActionPlan` shows three priority cards — title only, no body. Operator voice is high-level imperatives. Examples that work:
- "Scale Google"
- "Launch new ads"
- "Send all the new content to production"

Not "Cap the top ad set by 50% and shift to the new launch." That's tactics; it goes in the conversation with the media buyer, not the report.

## 9. Vercel CLI deploy works; REST script has a stale token

`scripts/deploy_vercel.sh` (CLI path) reliably deploys. `scripts/deploy_vercel_rest.py` returns `HTTP 403 invalidToken` on this account — use the CLI path unless we fix the token loading order. CLI builds remotely so a slow local `npm run build` doesn't block.

URL written to `clients/{slug}/mtd-reports/{YYYY-MM}/site-url.txt`.

## 10. NetNewReachChart mini-stats are derived from data

The `NetNewReachChart` component derives mini-stats (peak month, biggest expansion, last closed, current MTD) from `reach_history` and renders a generic "why this chart matters" paragraph. If you ever see hardcoded client names or percentages in a fresh scaffold, the template regressed.

## Narrative.json schema (canonical)

```json
{
  "worked": [...],            // legacy ad-set items (back-compat)
  "didnt_work": [...],
  "worked_moves": [           // deck-mode strategic moves (2-3)
    { "title": "...", "stat": "...", "detail": "..." }
  ],
  "didnt_moves": [...],
  "top_performers": [         // populated from ad-level Meta pull
    {
      "rank": 1, "adId": "...", "label": "...", "rawAdName": "...",
      "campaignName": "...", "formatBadge": "Flex Ad",
      "launchDate": "2026-04-22", "imageSrc": "/top-performers/ad1.jpg",
      "spend": 0, "roas": 0, "cpc": 0, "note": "..."
    }
  ],
  "top_performers_window": { "label": "Last 30 days", "range": "Apr 8 – May 7, 2026" },
  "shopify_mtd_note": "..."
}
```

The agent authors `worked_moves` / `didnt_moves` / `top_performers` / `creativeInsights` (in `page.tsx`) / `priorities` per report. Everything else is auto-populated.
