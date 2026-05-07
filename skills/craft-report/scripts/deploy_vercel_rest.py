#!/usr/bin/env python3
"""Deploy a craft-report MTD app to Vercel via the REST API.

Why this exists: the Vercel CLI hangs indefinitely on some accounts after
"Retrieving project…" — happens reliably inside Claude Code subagent shells
and intermittently in plain terminals. This script bypasses the CLI and posts
files directly to Vercel's deployment API.

Bonus: Vercel builds remotely, so you do NOT need a successful local
`npm run build` first. We've also seen the local build hang silently at 0%
CPU on the same machines where the CLI hangs. This script ships source.

Usage:
  python3 .claude/skills/craft-report/scripts/deploy_vercel_rest.py <slug> <YYYY-MM>
    [--preview]    # build a preview URL instead of production
    [--token TOK]  # Vercel auth token (else reads VERCEL_TOKEN env or .env or auth.json)
    [--team TEAM]  # Vercel team ID (else reads VERCEL_TEAM_ID env or .env)

Auth fallback chain for token:
  1. --token flag
  2. VERCEL_TOKEN env
  3. {workspace}/.env  → VERCEL_TOKEN=...
  4. ~/Library/Application Support/com.vercel.cli/auth.json  (macOS, vercel login)
  5. ~/.local/share/com.vercel.cli/auth.json  (Linux)

The Vercel CLI's auth.json is what `vercel login` writes; the script
auto-refreshes if you've recently run `npx vercel whoami`.
"""
from __future__ import annotations

import argparse
import hashlib
import json
import os
import sys
import time
import urllib.error
import urllib.request
from pathlib import Path

SCRIPT_DIR = Path(__file__).resolve().parent
WORKSPACE_ROOT = SCRIPT_DIR.parents[3]

EXCLUDE_DIRS = {"node_modules", ".next", ".vercel", ".git"}
EXCLUDE_FILE_NAMES = {".DS_Store"}
POLL_INTERVAL = 5
POLL_MAX_ITERS = 240  # 20 minutes


def load_token(arg_token: str | None) -> str:
    if arg_token:
        return arg_token
    env = os.environ.get("VERCEL_TOKEN")
    if env:
        return env
    # .env at workspace root
    env_path = WORKSPACE_ROOT / ".env"
    if env_path.exists():
        for line in env_path.read_text().splitlines():
            if line.startswith("VERCEL_TOKEN="):
                return line.split("=", 1)[1].strip().strip('"').strip("'")
    # macOS Vercel CLI auth.json
    for auth_path in [
        Path.home() / "Library/Application Support/com.vercel.cli/auth.json",
        Path.home() / ".local/share/com.vercel.cli/auth.json",
    ]:
        if auth_path.exists():
            try:
                d = json.loads(auth_path.read_text())
                if d.get("token"):
                    return d["token"]
            except Exception:
                pass
    sys.exit(
        "No Vercel token found. Provide --token, set VERCEL_TOKEN, or run "
        "`npx vercel login` to populate ~/Library/Application Support/com.vercel.cli/auth.json."
    )


def load_team(arg_team: str | None) -> str | None:
    if arg_team:
        return arg_team
    env = os.environ.get("VERCEL_TEAM_ID")
    if env:
        return env
    env_path = WORKSPACE_ROOT / ".env"
    if env_path.exists():
        for line in env_path.read_text().splitlines():
            if line.startswith("VERCEL_TEAM_ID="):
                return line.split("=", 1)[1].strip().strip('"').strip("'")
    return None  # personal account, not a team


def collect_files(root: Path) -> list[tuple[str, Path]]:
    files: list[tuple[str, Path]] = []
    for dirpath, dirnames, filenames in os.walk(root):
        dirnames[:] = [d for d in dirnames if d not in EXCLUDE_DIRS]
        for fn in filenames:
            if fn in EXCLUDE_FILE_NAMES or fn.endswith(".log"):
                continue
            full = Path(dirpath) / fn
            rel = str(full.relative_to(root)).replace(os.sep, "/")
            files.append((rel, full))
    return files


def upload_file(token: str, team_id: str | None, full_path: Path, sha: str) -> None:
    qs = f"?teamId={team_id}" if team_id else ""
    data = full_path.read_bytes()
    req = urllib.request.Request(
        f"https://api.vercel.com/v2/files{qs}",
        data=data,
        method="POST",
        headers={
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/octet-stream",
            "x-vercel-digest": sha,
        },
    )
    try:
        with urllib.request.urlopen(req, timeout=180) as resp:
            resp.read()
    except urllib.error.HTTPError as e:
        body = e.read().decode("utf-8", errors="replace")
        if e.code == 409 or "already_exists" in body:
            return  # cached server-side, fine
        raise RuntimeError(f"upload {full_path.name} failed: HTTP {e.code} {body}")


def create_deployment(
    token: str, team_id: str | None, project_name: str, files: list[dict], target: str
) -> dict:
    qs = f"?forceNew=1"
    if team_id:
        qs += f"&teamId={team_id}"
    body = {
        "name": project_name,
        "files": files,
        "target": target,
        "projectSettings": {
            "framework": "nextjs",
            "nodeVersion": "22.x",
        },
    }
    req = urllib.request.Request(
        f"https://api.vercel.com/v13/deployments{qs}",
        data=json.dumps(body).encode("utf-8"),
        method="POST",
        headers={
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json",
        },
    )
    try:
        with urllib.request.urlopen(req, timeout=120) as resp:
            return json.loads(resp.read())
    except urllib.error.HTTPError as e:
        body = e.read().decode("utf-8", errors="replace")
        sys.exit(f"Deployment create failed: HTTP {e.code} {body}")


def poll_deployment(token: str, team_id: str | None, deploy_id: str) -> dict:
    qs = f"?teamId={team_id}" if team_id else ""
    for _ in range(POLL_MAX_ITERS):
        time.sleep(POLL_INTERVAL)
        req = urllib.request.Request(
            f"https://api.vercel.com/v13/deployments/{deploy_id}{qs}",
            headers={"Authorization": f"Bearer {token}"},
        )
        try:
            with urllib.request.urlopen(req, timeout=30) as resp:
                r = json.loads(resp.read())
        except urllib.error.HTTPError as e:
            print(f"  status err: {e.code}", flush=True)
            continue
        state = r.get("readyState") or r.get("state")
        print(f"  state={state}", flush=True)
        if state in ("READY", "ERROR", "CANCELED"):
            return r
    sys.exit("Timed out waiting for deployment")


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("slug", help="Client slug (e.g. ts_twelve_south)")
    ap.add_argument("report_month", help="YYYY-MM")
    ap.add_argument("--preview", action="store_true")
    ap.add_argument("--token", default=None)
    ap.add_argument("--team", default=None)
    ap.add_argument(
        "--app-dir",
        default=None,
        help="Override the source directory (default: apps/mtd-reports/{app-slug}-{month})",
    )
    args = ap.parse_args()

    token = load_token(args.token)
    team_id = load_team(args.team)
    target = "preview" if args.preview else "production"

    # Derive app directory the same way scaffold_report.py does:
    # strip {prefix}_ from slug, replace _ with -.
    app_slug = args.slug.split("_", 1)[1] if "_" in args.slug else args.slug
    app_slug = app_slug.replace("_", "-")
    project_name = f"{app_slug}-{args.report_month}"
    src_dir = (
        Path(args.app_dir)
        if args.app_dir
        else WORKSPACE_ROOT / "apps" / "mtd-reports" / f"{app_slug}-{args.report_month}"
    )

    if not src_dir.is_dir():
        sys.exit(f"App directory not found: {src_dir}\nRun scaffold_report.py first.")

    print(f"Deploying {project_name} ({target}) from {src_dir}", flush=True)
    files = collect_files(src_dir)
    print(f"  Collected {len(files)} files", flush=True)

    file_records = []
    for rel, full in files:
        data = full.read_bytes()
        sha = hashlib.sha1(data).hexdigest()
        file_records.append({"path": rel, "size": len(data), "sha": sha, "full": full})

    for fr in file_records:
        upload_file(token, team_id, fr["full"], fr["sha"])
    print(f"  Uploaded {len(file_records)} files", flush=True)

    deploy_files = [
        {"file": fr["path"], "size": fr["size"], "sha": fr["sha"]}
        for fr in file_records
    ]
    res = create_deployment(token, team_id, project_name, deploy_files, target)
    deploy_id = res.get("id")
    deploy_url = res.get("url")
    print(f"  Created: id={deploy_id} url=https://{deploy_url}", flush=True)

    final = poll_deployment(token, team_id, deploy_id)
    state = final.get("readyState") or final.get("state")
    if state != "READY":
        err = final.get("errorMessage") or final
        print(f"\nDeploy failed in state {state}", flush=True)
        print(json.dumps(err, indent=2)[:2000], flush=True)
        sys.exit(2)

    full_url = f"https://{deploy_url}"
    aliases = final.get("alias", []) or []
    print(f"\nDeployed: {full_url}", flush=True)
    for a in aliases:
        print(f"  Alias:  https://{a}", flush=True)

    # Persist URL next to the report data, matching deploy_vercel.sh behavior
    url_file = WORKSPACE_ROOT / "clients" / args.slug / "mtd-reports" / args.report_month / "site-url.txt"
    url_file.parent.mkdir(parents=True, exist_ok=True)
    primary = next((f"https://{a}" for a in aliases if not a.endswith(".vercel.app") is False and "rooster-sanchezs-projects" not in a), None)
    url_file.write_text((primary or full_url) + "\n")
    print(f"  URL recorded: {url_file}", flush=True)


if __name__ == "__main__":
    main()
