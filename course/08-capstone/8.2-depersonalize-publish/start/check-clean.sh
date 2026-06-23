#!/usr/bin/env bash
# check-clean.sh — a teaching-sized depersonalization check, modeled directly on
# this repo's own scripts/check-depersonalized.sh (the worked example).
#
# It runs TWO PASSES with DIFFERENT SCOPES, because the failure modes differ:
#   Pass 1 — SECRETS:  a live API key must appear NOWHERE. Scanned over the whole
#            harness directory. A key anywhere is a hard fail.
#   Pass 2 — PERSONAL: absolute home paths, personal email, employer, private repo
#            names must be clean in the SHIPPED harness. (In a full repo this pass
#            is scoped to the harness/reference dir so teaching prose that *names*
#            these bad patterns doesn't trip it. Here the whole argument IS the
#            harness, so both passes scan the same dir — but the scope split is the
#            design point: a secret is never okay; a personal token is okay only in
#            material that's teaching you not to use it.)
#
# Usage: bash check-clean.sh <harness-dir>
# Exit:  0 = clean, 1 = a forbidden token was found, 2 = bad invocation.

set -uo pipefail

DIR="${1:-}"
if [ -z "$DIR" ] || [ ! -d "$DIR" ]; then
  echo "usage: bash check-clean.sh <harness-dir>" >&2
  exit 2
fi

# Pass 1 — SECRETS: live key shapes that must never appear.
SECRET_PATTERNS=(
  'sk-proj-[A-Za-z0-9]{8}'    # OpenAI project key shape
  'sk-ant-[A-Za-z0-9]{8}'     # Anthropic key shape
  'ghp_[A-Za-z0-9]{20}'       # GitHub personal access token
  # TODO (blank 1): add the OpenRouter key shape. It looks like:  sk-or-v1-<key chars>
  #   Write the same regex style as the lines above — a literal prefix followed by
  #   a run of key characters. The dirty fixture plants an sk-or-v1- key; without
  #   this line pass 1 won't catch it. (Hint: sk-or-v1-[A-Za-z0-9-]{8,})
  'sk-or-v1-[A-Za-z0-9-]{8,}' # OpenRouter key shape
)

# Pass 2 — PERSONAL: data that must be clean in the shipped harness.
PERSONAL_PATTERNS=(
  '/Users/[a-z]'              # absolute macOS home paths
  '/home/[a-z]'              # absolute Linux home paths
  'OPENROUTER_API_KEY'        # use a provider-neutral LLM_API_KEY instead
)

have_rg() { command -v rg >/dev/null 2>&1; }
scan() { # scan <dir> <pattern>
  if have_rg; then
    rg -n --no-heading --glob '!.git/**' --glob '!**/node_modules/**' "$2" "$1" 2>/dev/null
  else
    grep -rnE --exclude-dir=.git --exclude-dir=node_modules "$2" "$1" 2>/dev/null
  fi
}

fail=0

echo "── Pass 1: secrets (whole harness) ──"
for pat in "${SECRET_PATTERNS[@]}"; do
  hits=$(scan "$DIR" "$pat")
  if [ -n "$hits" ]; then
    echo "✗ possible secret /$pat/ found:"; echo "$hits" | sed 's/^/    /'; fail=1
  fi
done

echo "── Pass 2: personal tokens (shipped harness) ──"
for pat in "${PERSONAL_PATTERNS[@]}"; do
  # TODO (blank 2): scan the harness directory (the "$DIR" argument) for this
  #   personal pattern — that's the pass-2 scope. Mirror the pass-1 loop above.
  hits=$(scan "$DIR" "$pat")
  if [ -n "$hits" ]; then
    echo "✗ forbidden token /$pat/ found:"; echo "$hits" | sed 's/^/    /'; fail=1
  fi
done

if [ "$fail" -eq 0 ]; then
  echo "✓ depersonalization check passed."
fi
exit "$fail"
