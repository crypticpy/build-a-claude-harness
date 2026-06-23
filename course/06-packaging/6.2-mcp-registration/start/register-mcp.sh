#!/usr/bin/env bash
set -euo pipefail

# ──────────────────────────────────────────────────────────────────────────────
# MCP registration (6.2) — tell Claude Code about the harness's MCP server.
#
# Reads mcp-servers.json and registers each server via `claude mcp add`. Two
# skip-if-missing guards keep it safe in any environment:
#   1. no `claude` CLI on PATH  → skip everything (warn, exit 0)
#   2. a server's built file is missing → skip THAT server (it isn't built yet)
# Idempotent: a server already registered is removed first, then re-added.
#
# Anchored to reference/install.sh step 4 + reference/mcp-servers.json.
#
# Usage:
#   ./register-mcp.sh             # register for real
#   ./register-mcp.sh --dry-run   # print the claude mcp add commands; run nothing
# ──────────────────────────────────────────────────────────────────────────────

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SERVERS_JSON="$SCRIPT_DIR/mcp-servers.json"

DRY_RUN=false
[[ "${1:-}" == "--dry-run" ]] && DRY_RUN=true

info() { echo "[info]  $1"; }
ok()   { echo "[ok]    $1"; }
warn() { echo "[warn]  $1"; }

if [[ ! -f "$SERVERS_JSON" ]]; then
  echo "[error] mcp-servers.json not found at $SERVERS_JSON" >&2
  exit 1
fi

# expand_home — turn the literal ${HOME} marker in the JSON into the real home.
# Unlike settings.json (copied verbatim for Claude Code to expand), the paths we
# hand to `claude mcp add` are used NOW, on THIS machine, so we expand them here.
expand_home() { echo "${1//\$\{HOME\}/$HOME}"; }

# ── Guard 1: no claude CLI → skip the whole step, cleanly ─────────────────────
# TODO 1: skip the WHOLE step when `claude` is NOT on PATH — a fresh machine
# without the CLI is a normal state, not an error. Replace the condition `false`
# below with the real test:  ! command -v claude >/dev/null 2>&1
if false; then # ← TODO 1: replace `false` with the not-on-PATH test
  warn "claude CLI not found on PATH — skipping MCP registration. Install it, then re-run."
  exit 0
fi
ok "claude CLI found"

# ── Walk each server in the JSON ──────────────────────────────────────────────
count="$(node -e 'const d=require(process.argv[1]); console.log((d.servers||[]).length)' "$SERVERS_JSON")"
info "registering $count server(s) from mcp-servers.json"

for i in $(seq 0 $((count - 1))); do
  name="$(node -e 'const d=require(process.argv[1]); console.log(d.servers[+process.argv[2]].name)' "$SERVERS_JSON" "$i")"
  cmd="$(node -e 'const d=require(process.argv[1]); console.log(d.servers[+process.argv[2]].command)' "$SERVERS_JSON" "$i")"
  args_raw="$(node -e 'const d=require(process.argv[1]); console.log((d.servers[+process.argv[2]].args||[]).join("\n"))' "$SERVERS_JSON" "$i")"
  skip="$(node -e 'const d=require(process.argv[1]); console.log(d.servers[+process.argv[2]].skip_if_missing||"")' "$SERVERS_JSON" "$i")"

  # Expand ${HOME} in args + the skip marker for use on this machine.
  skip="$(expand_home "$skip")"
  args=()
  while IFS= read -r a; do [[ -n "$a" ]] && args+=("$(expand_home "$a")"); done <<< "$args_raw"

  # ── Guard 2: skip THIS server if its built file is missing ──────────────────
  # TODO 2: skip THIS server when its built file is missing — it isn't built yet
  # (Part 4's `npm run build` hasn't produced dist/ on this machine). Replace the
  # condition `false` below with:  [[ -n "$skip" && ! -e "$skip" ]]
  if false; then # ← TODO 2: replace `false` with the skip-if-missing test
    warn "$name — built file missing ($skip); skipping. Build it, then re-run."
    continue
  fi

  if $DRY_RUN; then
    echo "[dry-run] would: claude mcp add $name -- $cmd ${args[*]}"
    continue
  fi

  # Idempotent add: drop an existing registration first so re-runs don't error.
  if claude mcp list 2>/dev/null | grep -q "^${name}"; then
    claude mcp remove "$name" >/dev/null 2>&1 || true
  fi
  if claude mcp add "$name" -- "$cmd" "${args[@]}" >/dev/null 2>&1; then
    ok "$name registered"
  else
    warn "$name registration failed — register manually: claude mcp add $name -- $cmd ${args[*]}"
  fi
done

echo ""
echo "Done. Verify with:  claude mcp list   # should list the registered server(s)"
