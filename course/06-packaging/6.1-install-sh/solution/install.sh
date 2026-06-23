#!/usr/bin/env bash
set -euo pipefail

# ──────────────────────────────────────────────────────────────────────────────
# Course installer (6.1) — settings + payload into ~/.claude, idempotently.
#
# Anchored to reference/install.sh, trimmed to the packaging core: render the
# settings template, copy the harness payload, and do it in a way that is SAFE to
# re-run. The MCP build/registration (reference steps 2 & 4) is lesson 6.2.
#
# Idempotent: running twice leaves the same bytes on disk the second time as the
# first. Existing settings.json is BACKED UP before overwrite — never silently
# clobbered, never rm -rf'd.
#
# Usage:
#   ./install.sh              # install into $HOME/.claude
#   ./install.sh --dry-run    # print what it WOULD do; write nothing
#   CLAUDE_HARNESS_TARGET=/tmp/foo ./install.sh   # install into a throwaway dir
# ──────────────────────────────────────────────────────────────────────────────

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Target defaults to ~/.claude, but an env override lets the checkpoint install
# into a throwaway dir without touching your real home.
CLAUDE_DIR="${CLAUDE_HARNESS_TARGET:-$HOME/.claude}"

DRY_RUN=false
[[ "${1:-}" == "--dry-run" ]] && DRY_RUN=true

info() { echo "[info]  $1"; }
ok()   { echo "[ok]    $1"; }
warn() { echo "[warn]  $1"; }

# run <description> <command...> — execute, or just describe under --dry-run.
run() {
  local desc="$1"; shift
  if $DRY_RUN; then
    echo "[dry-run] would $desc"
  else
    "$@"
  fi
}

echo ""
echo "Course installer (6.1)"
echo "  source: $SCRIPT_DIR"
echo "  target: $CLAUDE_DIR"
$DRY_RUN && echo "  mode:   DRY RUN (no changes will be written)"
echo ""

TEMPLATE="$SCRIPT_DIR/settings.template.json"
SETTINGS="$CLAUDE_DIR/settings.json"

if [[ ! -f "$TEMPLATE" ]]; then
  echo "[error] settings.template.json not found at $TEMPLATE" >&2
  exit 1
fi

# ── Step 1: create the target tree (mkdir -p is itself idempotent) ────────────
# TODO 1: create $CLAUDE_DIR and the $CLAUDE_DIR/hooks subdir. Use `mkdir -p`
# (the -p flag is what makes this safe to re-run — it never errors if the dir
# already exists). Wire it through `run` so --dry-run describes it:
#
#   run "create $CLAUDE_DIR" mkdir -p "$CLAUDE_DIR" "$CLAUDE_DIR/hooks"
#
run "create $CLAUDE_DIR" mkdir -p "$CLAUDE_DIR" "$CLAUDE_DIR/hooks"

# ── Step 2: back up an existing settings.json, then render the template ────────
# settings.json is the one USER-OWNED file we might overwrite, so we copy it
# aside first. Everything else in the payload is harness-owned.
if [[ -f "$SETTINGS" ]]; then
  BACKUP="$SETTINGS.backup.$(date +%Y%m%d-%H%M%S)"
  warn "existing settings.json — backing up to $(basename "$BACKUP")"
  # TODO 2: copy $SETTINGS to $BACKUP via `run`. Use `cp` (a copy, so the
  # original is preserved). NEVER `rm` or `mv` the user's file.
  #
  #   run "back up settings.json" cp "$SETTINGS" "$BACKUP"
  #
  run "back up settings.json" cp "$SETTINGS" "$BACKUP"
fi

# The template uses $HOME inside hook command strings. Claude Code expands that
# at hook-execution time — so a STRAIGHT COPY is the entire render step. We do
# NOT substitute $HOME here; doing so would bake one machine's path into the file.
# TODO 3: copy the template to $SETTINGS via `run`. A plain `cp` — no `sed`, no
# `envsubst`, no variable expansion. That verbatim copy is the lesson.
#
#   run "render settings.template.json -> settings.json" cp "$TEMPLATE" "$SETTINGS"
#
run "render settings.template.json -> settings.json" cp "$TEMPLATE" "$SETTINGS"

# ── Step 3: copy the harness payload into place ───────────────────────────────
# These files are harness-owned; overwriting them on re-run is correct and is
# what keeps the install idempotent (the bytes converge to the source every run).
for item in hooks statusline-command.sh; do
  if [[ -e "$SCRIPT_DIR/$item" ]]; then
    if [[ -d "$SCRIPT_DIR/$item" ]]; then
      # `cp -R src/. dst/` copies the CONTENTS into dst (merges), so re-runs
      # don't nest dirs (src/foo/foo). The trailing /. is doing real work.
      run "copy $item/ -> $CLAUDE_DIR/$item/" cp -R "$SCRIPT_DIR/$item/." "$CLAUDE_DIR/$item/"
    else
      run "copy $item -> $CLAUDE_DIR/$item" cp "$SCRIPT_DIR/$item" "$CLAUDE_DIR/$item"
    fi
  fi
done

$DRY_RUN || ok "settings + payload installed"

echo ""
if $DRY_RUN; then
  echo "Dry run complete. Nothing was written."
else
  echo "Installation complete. Re-running is safe — it converges to the same files."
fi
echo ""
