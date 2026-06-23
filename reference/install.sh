#!/usr/bin/env bash
set -euo pipefail

# ──────────────────────────────────────────────────────────────────────────────
# Reference harness — installer
#
# Installs the unified hook system, slash commands, agents, the example skill,
# the status line, and the context-layer MCP server into ~/.claude. Idempotent:
# re-running is safe. Existing settings.json is backed up (never silently
# clobbered). No API key is ever written or echoed.
#
# Usage:
#   ./install.sh              # install into $HOME/.claude
#   ./install.sh --dry-run    # print what it WOULD do; write nothing
# ──────────────────────────────────────────────────────────────────────────────

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CLAUDE_DIR="${CLAUDE_HARNESS_TARGET:-$HOME/.claude}"
PLUGIN_SRC="$SCRIPT_DIR/plugins/context-layer"
MCP_JS="$CLAUDE_DIR/plugins/context-layer/dist/mcp-server.js"

DRY_RUN=false
[[ "${1:-}" == "--dry-run" ]] && DRY_RUN=true

# ── Output helpers ────────────────────────────────────────────────────────────
RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; CYAN='\033[0;36m'; NC='\033[0m'
info()  { echo -e "${CYAN}[info]${NC}  $1"; }
ok()    { echo -e "${GREEN}[ok]${NC}    $1"; }
warn()  { echo -e "${YELLOW}[warn]${NC}  $1"; }
error() { echo -e "${RED}[error]${NC} $1"; }
plan()  { echo -e "${CYAN}[dry-run]${NC} would $1"; }

# run <description> <command...> — execute, or just describe under --dry-run.
run() {
  local desc="$1"; shift
  if $DRY_RUN; then
    plan "$desc"
  else
    "$@"
  fi
}

echo ""
echo "Reference harness — installer"
echo "  source: $SCRIPT_DIR"
echo "  target: $CLAUDE_DIR"
$DRY_RUN && echo "  mode:   DRY RUN (no changes will be written)"
echo ""

# ── Step 1: prerequisites ─────────────────────────────────────────────────────
info "Step 1/5 — checking prerequisites"

if command -v node >/dev/null 2>&1; then
  NODE_MAJOR="$(node -e 'console.log(process.versions.node.split(".")[0])' 2>/dev/null || echo 0)"
  if [[ "$NODE_MAJOR" -lt 20 ]]; then
    error "Node.js 20+ required (found $(node -v)). Upgrade Node and re-run."
    exit 1
  fi
  ok "node $(node -v)"
else
  error "node not found on PATH. Install Node.js 20+ and re-run."
  exit 1
fi

if command -v claude >/dev/null 2>&1; then
  ok "claude CLI found"
else
  warn "claude CLI not found — MCP registration (step 4) will be skipped. Install it to finish wiring."
fi

# ── Step 2: build the context-layer MCP server ────────────────────────────────
info "Step 2/5 — building the context-layer MCP server"

if [[ -f "$PLUGIN_SRC/package.json" ]]; then
  if $DRY_RUN; then
    plan "cd $PLUGIN_SRC && (npm ci || npm install) && npm run build"
  else
    (
      cd "$PLUGIN_SRC"
      if [[ -f package-lock.json ]]; then
        npm ci || npm install
      else
        npm install
      fi
      npm run build
    )
    if [[ -f "$PLUGIN_SRC/dist/mcp-server.js" ]]; then
      ok "MCP server built ($PLUGIN_SRC/dist/mcp-server.js)"
    else
      error "build ran but dist/mcp-server.js is missing — check the TypeScript build output."
      exit 1
    fi
  fi
else
  warn "context-layer plugin not found at $PLUGIN_SRC — skipping build. (Expected once the MCP is assembled.)"
fi

# ── Step 3: install settings + payload into $CLAUDE_DIR ───────────────────────
info "Step 3/5 — installing settings, hooks, commands, agents, and skills"

TEMPLATE="$SCRIPT_DIR/settings.template.json"
SETTINGS="$CLAUDE_DIR/settings.json"

if [[ ! -f "$TEMPLATE" ]]; then
  error "settings.template.json not found at $TEMPLATE"
  exit 1
fi

run "create $CLAUDE_DIR and subdirectories" mkdir -p \
  "$CLAUDE_DIR" \
  "$CLAUDE_DIR/plugins" \
  "$CLAUDE_DIR/powerline" \
  "$CLAUDE_DIR/hooks/unified/evolution"

# Back up an existing settings.json before overwriting — never clobber silently.
if [[ -f "$SETTINGS" ]]; then
  BACKUP="$SETTINGS.backup.$(date +%Y%m%d-%H%M%S)"
  warn "existing settings.json found — backing up to $(basename "$BACKUP")"
  run "back up $SETTINGS -> $BACKUP" cp "$SETTINGS" "$BACKUP"
fi

# The template uses $HOME inside hook command strings, which Claude Code expands
# at hook-execution time, so a straight copy is the render step.
run "render settings.template.json -> $SETTINGS" cp "$TEMPLATE" "$SETTINGS"

# Copy the rest of the harness payload into place. Existing files are overwritten
# (these are harness-owned, not user edits); the only user-owned file is
# settings.json, which we backed up above. `powerline/` ships the data-only
# pricing table the statusline reads.
for sub in hooks commands agents skills plugins powerline; do
  if [[ -d "$SCRIPT_DIR/$sub" ]]; then
    run "copy $sub/ -> $CLAUDE_DIR/$sub/" cp -R "$SCRIPT_DIR/$sub/." "$CLAUDE_DIR/$sub/"
  fi
done

# The statusline renderer is a top-level file, not a dir — settings.template.json
# points statusLine at $HOME/.claude/statusline-command.sh, so it must land beside
# settings.json. (The for-loop above only walks directories.)
if [[ -f "$SCRIPT_DIR/statusline-command.sh" ]]; then
  run "copy statusline-command.sh -> $CLAUDE_DIR/statusline-command.sh" \
    cp "$SCRIPT_DIR/statusline-command.sh" "$CLAUDE_DIR/statusline-command.sh"
fi

$DRY_RUN || ok "settings + payload installed"

# ── Step 4: register the MCP server with Claude Code (idempotent) ──────────────
info "Step 4/5 — registering the context-layer MCP server"

if command -v claude >/dev/null 2>&1; then
  if $DRY_RUN; then
    plan "register context-layer via: claude mcp add context-layer -- node \"$MCP_JS\" (re-registering if already present)"
  elif [[ -f "$MCP_JS" ]]; then
    # Guard against re-run errors: drop any existing registration first, then add.
    if claude mcp list 2>/dev/null | grep -q '^context-layer'; then
      claude mcp remove context-layer >/dev/null 2>&1 || true
    fi
    if claude mcp add context-layer -- node "$MCP_JS" >/dev/null 2>&1; then
      ok "context-layer registered"
    else
      warn "context-layer registration failed — register manually: claude mcp add context-layer -- node \"$MCP_JS\""
    fi
  else
    warn "MCP server not built at $MCP_JS — skipping registration. Re-run after step 2 succeeds."
  fi
else
  warn "claude CLI missing — skipping MCP registration."
fi

# ── Step 5: verification block ────────────────────────────────────────────────
info "Step 5/5 — verify"
echo ""
echo "  Verify the install:"
echo "    claude mcp list            # should list: context-layer"
echo ""
echo "  Set your LLM environment (the memory/analysis features read these):"
echo "    export LLM_API_KEY=...     # your provider key (or OPENAI_API_KEY)"
echo "    export LLM_MODEL=...       # any small/cheap model id your key can reach"
echo "    export LLM_BASE_URL=...    # provider API root (default: https://api.openai.com/v1)"
echo "    export LLM_API_FORMAT=...  # responses (default) | chat"
echo "  See .env.example for the full list. Leaving them unset is fine — LLM steps just skip."
echo ""

if $DRY_RUN; then
  echo "Dry run complete. Nothing was written."
else
  echo "Installation complete. Start a new Claude Code session to activate."
fi
echo ""
