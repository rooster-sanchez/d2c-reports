#!/usr/bin/env bash
#
# Deploy a per-client MTD report to Vercel.
#
# Usage:
#   bash .claude/skills/craft-report/scripts/deploy_vercel.sh <slug> <YYYY-MM> [--preview]
#
# Mirrors cmo-site/scripts/deploy_vercel.sh. Vercel auth uses either
# VERCEL_TOKEN from root .env, or an OAuth session via `vercel login`.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
WORKSPACE_ROOT="$(cd "${SCRIPT_DIR}/../../../.." && pwd)"

SLUG="${1:-}"
REPORT_MONTH="${2:-}"
shift 2 2>/dev/null || true
MODE="prod"

for arg in "$@"; do
  case "$arg" in
    --preview) MODE="preview" ;;
    *) echo "Unknown arg: $arg" >&2; exit 2 ;;
  esac
done

if [[ -z "$SLUG" || -z "$REPORT_MONTH" ]]; then
  echo "Usage: deploy_vercel.sh <slug> <YYYY-MM> [--preview]" >&2
  exit 2
fi

# Strip the ts_/pf_/etc prefix for the app directory name
APP_SLUG="${SLUG#*_}"
APP_SLUG="${APP_SLUG//_/-}"
SITE_DIR="${WORKSPACE_ROOT}/apps/mtd-reports/${APP_SLUG}-${REPORT_MONTH}"
if [[ ! -d "$SITE_DIR" ]]; then
  echo "Site not scaffolded: ${SITE_DIR}. Run scaffold_report.py first." >&2
  exit 1
fi

# Load VERCEL_TOKEN (optional)
if [[ -z "${VERCEL_TOKEN:-}" && -f "${WORKSPACE_ROOT}/.env" ]]; then
  VERCEL_TOKEN=$(grep -E "^VERCEL_TOKEN=" "${WORKSPACE_ROOT}/.env" 2>/dev/null | head -1 | cut -d= -f2- | tr -d "'\"" || true)
  export VERCEL_TOKEN
fi

# Locate vercel CLI (node via nvm if needed)
if ! command -v vercel >/dev/null 2>&1; then
  if [[ -n "${NVM_DIR:-}" && -f "${NVM_DIR}/nvm.sh" ]]; then
    # shellcheck disable=SC1091
    . "${NVM_DIR}/nvm.sh"
    nvm use --lts >/dev/null 2>&1 || true
  fi
fi

# Use npx if vercel still isn't on PATH
VERCEL_CMD="vercel"
if ! command -v vercel >/dev/null 2>&1; then
  if command -v npx >/dev/null 2>&1; then
    VERCEL_CMD="npx -y vercel@latest"
  else
    echo "vercel CLI not found and npx unavailable. Install: npm i -g vercel" >&2
    exit 1
  fi
fi

if [[ -z "${VERCEL_TOKEN:-}" ]]; then
  if ! $VERCEL_CMD whoami >/dev/null 2>&1; then
    echo "Not authenticated with Vercel. Run 'vercel login' first," >&2
    echo "or add VERCEL_TOKEN to ${WORKSPACE_ROOT}/.env" >&2
    exit 1
  fi
fi

cd "$SITE_DIR"

# npm install if node_modules missing (scaffold doesn't run it to keep things fast)
if [[ ! -d node_modules ]]; then
  echo "Installing dependencies..."
  npm install --no-audit --no-fund --loglevel=error
fi

PROJECT_NAME="mtd-${APP_SLUG}-${REPORT_MONTH}"
DEPLOY_ARGS=(--yes --name "$PROJECT_NAME")
if [[ -n "${VERCEL_TOKEN:-}" ]]; then
  DEPLOY_ARGS+=(--token "$VERCEL_TOKEN")
fi
if [[ "$MODE" == "prod" ]]; then
  DEPLOY_ARGS+=(--prod)
fi

echo "Deploying ${PROJECT_NAME} (mode: ${MODE})..."
OUTPUT=$($VERCEL_CMD deploy "${DEPLOY_ARGS[@]}" 2>&1 | tee /dev/stderr || true)
URL=$(echo "$OUTPUT" | grep -Eo 'https://[A-Za-z0-9.-]+\.vercel\.app' | tail -n1 || true)

if [[ -z "$URL" ]]; then
  echo "Could not parse deployment URL from vercel output." >&2
  exit 1
fi

# Persist the URL next to the report data
URL_FILE="${WORKSPACE_ROOT}/clients/${SLUG}/mtd-reports/${REPORT_MONTH}/site-url.txt"
mkdir -p "$(dirname "$URL_FILE")"
echo "$URL" > "$URL_FILE"

echo ""
echo "Deployed: ${URL}"
echo "URL recorded: ${URL_FILE}"
