#!/usr/bin/env bash
# statusline-command.sh — the one-line dashboard under your prompt.
#
# Claude Code pipes a JSON blob to this script's stdin on every render and prints
# whatever the script writes to stdout. We pull out model, context usage, and
# session cost, then draw a colored bar showing how full the context window is
# relative to the auto-compact threshold.
#
# Anchored to reference statusline-command.sh, trimmed for teaching: model +
# context bar + cost (the reference adds git, time, tool count, SSH, and a
# shared stats file). Pure read-only — it computes from the JSON and prints; it
# changes nothing.

input="$(cat)"

# ── colors (truecolor escapes) ───────────────────────────────────────────────
c_reset='\e[0m'
c_muted='\e[38;2;140;140;140m'
c_symbol='\e[38;2;198;120;221m'   # purple — model
c_cost='\e[38;2;86;182;194m'      # cyan — cost
c_green='\e[38;2;80;250;123m'
c_yellow='\e[38;2;229;192;123m'
c_red='\e[38;2;224;108;117m'
c_dim='\e[38;2;90;90;90m'

# ── pull fields out of the JSON (jq; default everything so nulls never break) ─
model="$(echo "$input" | jq -r '.model.display_name // .model.id // "?"')"
session_cost="$(echo "$input" | jq -r '.cost.total_cost_usd // 0')"
[ "$session_cost" = "null" ] && session_cost=0

input_tok="$(echo "$input" | jq -r '.context_window.current_usage.input_tokens // 0')"
output_tok="$(echo "$input" | jq -r '.context_window.current_usage.output_tokens // 0')"
cache_read="$(echo "$input" | jq -r '.context_window.current_usage.cache_read_input_tokens // 0')"
cache_create="$(echo "$input" | jq -r '.context_window.current_usage.cache_creation_input_tokens // 0')"
for v in input_tok output_tok cache_read cache_create; do
  [ "${!v}" = "null" ] && printf -v "$v" 0
done

# ── compute context fullness vs the auto-compact threshold ────────────────────
# The threshold is WINDOW × ~80% — Claude Code's auto-compact fires near there.
# TODO 1: sum the four token types into ctx_tokens (input + output + cache_read +
# cache_create). This is the total context currently in use.
ctx_tokens=$(( input_tok + output_tok + cache_read + cache_create ))

auto_window="${CLAUDE_CODE_AUTO_COMPACT_WINDOW:-200000}"
compaction_threshold=$(( auto_window * 80 / 100 ))
ctx_k=$(( ctx_tokens / 1000 ))
compaction_k=$(( compaction_threshold / 1000 ))

# percent toward the compaction threshold, capped at 100
ctx_percent=$(( ctx_tokens * 100 / compaction_threshold ))
[ "$ctx_percent" -gt 100 ] && ctx_percent=100

# ── color the bar by how close we are to compaction ───────────────────────────
remaining=$(( compaction_threshold - ctx_tokens ))
# TODO 2: pick bar_color by `remaining`: <=10000 → c_red, <=50000 → c_yellow,
# otherwise → c_green. (Closer to compaction = hotter color.)
if [ "$remaining" -le 10000 ]; then
  bar_color="$c_red"
elif [ "$remaining" -le 50000 ]; then
  bar_color="$c_yellow"
else
  bar_color="$c_green"
fi

# ── draw a 10-char bar ────────────────────────────────────────────────────────
bar_width=10
filled=$(( ctx_percent * bar_width / 100 ))
empty=$(( bar_width - filled ))
bar_filled=""; bar_empty=""
for ((i=0; i<filled; i++)); do bar_filled+="█"; done
for ((i=0; i<empty;  i++)); do bar_empty+="░";  done

cost_display="$(printf '$%.2f' "$session_cost")"

# ── print: model | [bar] k/k (pct) | cost ─────────────────────────────────────
printf "%b%s%b  %b%s%b%s%b %sk/%sk (%s%%)  %b%s%b" \
  "$c_symbol" "$model" "$c_reset" \
  "$bar_color" "$bar_filled" "$c_dim" "$bar_empty" "$c_reset" \
  "$ctx_k" "$compaction_k" "$ctx_percent" \
  "$c_cost" "$cost_display" "$c_reset"
