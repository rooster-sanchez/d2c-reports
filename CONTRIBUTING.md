# Contributing

Issues and PRs welcome.

## What kind of change are you making?

**Bug fix or small improvement** — open a PR. Describe what broke and how you fixed it.

**New section / chart** — open an issue first. The report structure is intentional, and new sections need to match the overall philosophy (honest numbers, MER-centric, no spin).

**New data source** — open an issue. The current pipeline pulls Meta + Google + Shopify; extending to TikTok, Klaviyo, etc. needs a script (`pull_*.py`) + data-type additions to `data.ts` + a component.

**Design / palette changes** — go ahead. The template is under MIT, fork it or send patches.

## Local development

```bash
# Install into your own workspace (see README for full prereqs)
bash install.sh

# Iterate on the template directly
cd skills/craft-report/_template
npm install
npm run dev   # http://localhost:3000 renders the template with synthetic data

# Iterate on Python scripts
cd skills/craft-report/scripts
python3 -c "import ast; [ast.parse(open(f).read()) for f in ['pull_meta.py','pull_google.py','extract_brand.py','ingest_shopify.py','scaffold_report.py']]"
```

## Conventions

- **No secrets in commits.** `.env` is gitignored; double-check before PR.
- **Data types live in `_template/src/lib/data.ts`.** If you add a field, add it to the type AND the scaffold writer in `scaffold_report.py`.
- **Components read from `data.ts` only.** Don't hardcode per-client values.
- **Python scripts follow the existing style**: argparse at the top, one stage per script, write a single JSON artifact.

## Testing

Smoke test before PR:

```bash
# Scripts parse cleanly
python3 -c "import ast; [ast.parse(open(f).read()) for f in ['skills/craft-report/scripts/pull_meta.py', 'skills/craft-report/scripts/pull_google.py', 'skills/craft-report/scripts/scaffold_report.py']]"

# Template builds
cd skills/craft-report/_template && npm install && npm run build
```

End-to-end test: run `/craft-report {your-slug}` in a Claude Code workspace that has your data wired up.

## Release

This project uses semver-ish tags. Minor versions are new features, patch versions are bug fixes. Bump `CHANGELOG.md` + tag:

```bash
git tag v0.1.1 -m "Patch notes here"
git push --tags
```
