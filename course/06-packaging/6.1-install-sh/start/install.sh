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

# ── Step 1: create the target tree ────────────────────────────────────────────
# TODO 1: create the target dir tree — $CLAUDE_DIR and its hooks/ subdir — so the
# copies below land somewhere. Make it idempotent (which flag lets the command
# succeed when the dirs already exist?) and route it through `run` so --dry-run
# only describes the action instead of doing it.
: # TODO 1 — replace this line with the directory-creation command.

# ── Step 2: back up an existing settings.json, then render the template ────────
# settings.json is the one USER-OWNED file we might overwrite, so we copy it
# aside first. Everything else in the payload is harness-owned.
if [[ -f "$SETTINGS" ]]; then
  BACKUP="$SETTINGS.backup.$(date +%Y%m%d-%H%M%S)"
  warn "existing settings.json — backing up to $(basename "$BACKUP")"
  # TODO 2: preserve the user's existing $SETTINGS at $BACKUP before we overwrite
  # it below. The original must survive — pick the operation that leaves it in
  # place (not one that removes or renames it). Route it through `run`.
  : # TODO 2 — replace this line with the backup command.
fi

# The template uses $HOME inside hook command strings. Claude Code expands that
# at hook-execution time — so a STRAIGHT COPY is the entire render step. We do
# NOT substitute $HOME here; doing so would bake one machine's path into the file.
# TODO 3: put $TEMPLATE in place as $SETTINGS, verbatim. The render step is
# deliberately *not* a substitution — no `sed`, no `envsubst`, no `$HOME`
# expansion (that's what keeps the file portable). Route it through `run`.
: # TODO 3 — replace this line with the verbatim template-install command.

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
