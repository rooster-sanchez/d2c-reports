---
description: Craft a brand-aligned MTD performance report for a DTC client — Meta + Google + Shopify data, MER vs floor/goal, net-new-reach audience health, worked/didn't narrative, deployed as a Next.js microsite on Vercel. Conversational pipeline — asks for confirmation at each stage.
---

Invoke the `craft-report` skill. Load `.claude/skills/craft-report/SKILL.md` and walk the operator through the 10-stage conversational pipeline: bootstrap → brand detection → credentials → data pull → Shopify ingestion → website check → narrative → scaffold → build → deploy.

Arguments: $ARGUMENTS

Remember:
- MER = Shopify net sales ÷ total paid spend (Meta + Google). Not platform-attributed revenue.
- 2.5× is the default floor, 3.0× is the default goal. Override per-client via memory if the client has different targets.
- Lead with the issue when MER is under floor. Don't spin. Don't use "honest" language.
- Ask before each destructive action (scaffold reset, Vercel deploy). Safe actions (data pulls, npm build) can run without confirmation.
