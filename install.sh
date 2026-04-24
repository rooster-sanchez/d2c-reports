#!/usr/bin/env bash
#
# Install craft-report into the current workspace.
# Run from the root of the workspace where you want to use /craft-report.
#
# Usage:
#   bash <(curl -sSL https://raw.githubusercontent.com/{you}/craft-report/main/install.sh)

set -euo pipefail

REPO_URL="${CRAFT_REPORT_REPO:-https://github.com/rooster-sanchez/craft-report.git}"
BRANCH="${CRAFT_REPORT_BRANCH:-main}"

if [[ ! -d .claude ]]; then
  echo "→ Creating .claude/ in $(pwd)"
  mkdir -p .claude/skills .claude/commands
fi

TMP=$(mktemp -d)
trap 'rm -rf "$TMP"' EXIT

echo "→ Cloning $REPO_URL ($BRANCH) to $TMP"
git clone --depth=1 --branch "$BRANCH" "$REPO_URL" "$TMP" >/dev/null

echo "→ Installing skill to .claude/skills/craft-report/"
rm -rf .claude/skills/craft-report
cp -R "$TMP/skills/craft-report" .claude/skills/

echo "→ Installing slash command to .claude/commands/craft-report.md"
cp "$TMP/commands/craft-report.md" .claude/commands/

if [[ ! -f .env && -f "$TMP/.env.example" ]]; then
  echo "→ Copying .env.example to .env (you'll need to fill in values)"
  cp "$TMP/.env.example" .env
fi

echo ""
echo "✓ craft-report installed."
echo ""
echo "Next steps:"
echo "  1. Fill in credentials in .env (Meta, Google, optionally Vercel)"
echo "  2. Make sure you have a client directory at clients/{slug}/ with client.json + configs/fb_ads.json"
echo "  3. In Claude Code, run: /craft-report {slug}"
echo ""
echo "Docs: .claude/skills/craft-report/README.md"
