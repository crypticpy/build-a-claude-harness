#!/usr/bin/env bash
# check-depersonalized.sh — fail if personal/private/secret data leaks into the
# public repo. Two passes, because the failure modes differ:
#
#   1. SECRETS  → scanned repo-wide. A real key anywhere is a hard fail.
#   2. PERSONAL → scanned in reference/ only. The course and docs legitimately
#                 *name* bad examples ("don't hardcode gpt-5-mini") as teaching
#                 material; that must not trip. The shipped harness in reference/
#                 must be clean of them.
#
# Usage: ./scripts/check-depersonalized.sh
# Exit:  0 = clean, 1 = a forbidden token was found, 2 = bad invocation.

set -uo pipefail
cd "$(dirname "$0")/.." || exit 2

# Author's own public handle, allowed in LICENSE/README/badges. Override if forking.
AUTHOR_HANDLE="${AUTHOR_HANDLE:-crypticpy}"

# Pass 1 — SECRETS: must never appear anywhere in the repo.
SECRET_PATTERNS=(
  'sk-or-v1-[A-Za-z0-9]{8}'   # OpenRouter key shape
  'sk-proj-[A-Za-z0-9]{8}'    # OpenAI project key shape
  'sk-ant-[A-Za-z0-9]{8}'     # Anthropic key shape
  'AKIA[0-9A-Z]{12}'          # AWS access key id
  'ghp_[A-Za-z0-9]{20}'       # GitHub PAT
  'AIza[0-9A-Za-z_-]{30}'     # Google API key
)

# Pass 2 — PERSONAL: must not appear in the shipped reference harness, but ARE
# legitimate teaching material elsewhere (course prose names bad examples like a
# generic /Users/you path or "don't pin gpt-5-mini"). Scanned in reference/ only.
PERSONAL_PATTERNS=(
  '/Users/[a-z]'              # absolute home paths
  'foresight-app'             # private repo
  'gpt-5\.4-mini'             # private model id — use a placeholder/role instead
  'gpt-5-mini'                # private model id
  'Opus 4\.7'                 # stale attribution drift
  "git@github\\.com:${AUTHOR_HANDLE}"  # author's SSH remotes
  'OPENROUTER_API_KEY'        # use provider-neutral LLM_API_KEY
)

# Pass 3 — STRICT PERSONAL: identifies a specific real person/employer/home path.
# No legitimate teaching use anywhere, so scanned REPO-WIDE (course + docs too).
STRICT_PERSONAL_PATTERNS=(
  "/Users/${AUTHOR_HANDLE}"   # the author's actual home path (vs. a generic /Users/you)
  'aboveearthproductions'     # personal email local-part
  'City of Austin'            # employer
)

EXCLUDES=(--glob '!scripts/check-depersonalized.sh' --glob '!.git/**' --glob '!**/node_modules/**')

have_rg() { command -v rg >/dev/null 2>&1; }
scan() { # scan <path> <pattern>
  if have_rg; then
    rg -n --no-heading "${EXCLUDES[@]}" "$2" "$1" 2>/dev/null
  else
    grep -rnE --exclude-dir=.git --exclude-dir=node_modules \
         --exclude=check-depersonalized.sh "$2" "$1" 2>/dev/null
  fi
}

fail=0

echo "── Pass 1: secrets (repo-wide) ──"
for pat in "${SECRET_PATTERNS[@]}"; do
  hits=$(scan . "$pat")
  if [ -n "$hits" ]; then
    echo "✗ possible secret /$pat/ found:"; echo "$hits" | sed 's/^/    /'; fail=1
  fi
done

echo "── Pass 2: personal tokens (reference/ only) ──"
if [ -d reference ]; then
  for pat in "${PERSONAL_PATTERNS[@]}"; do
    hits=$(scan reference "$pat")
    if [ -n "$hits" ]; then
      echo "✗ forbidden token /$pat/ in reference/:"; echo "$hits" | sed 's/^/    /'; fail=1
    fi
  done
else
  echo "  (reference/ not built yet — skipping)"
fi

echo "── Pass 3: strict personal tokens (repo-wide) ──"
for pat in "${STRICT_PERSONAL_PATTERNS[@]}"; do
  hits=$(scan . "$pat")
  if [ -n "$hits" ]; then
    echo "✗ forbidden token /$pat/ (repo-wide):"; echo "$hits" | sed 's/^/    /'; fail=1
  fi
done

if [ "$fail" -eq 0 ]; then
  echo "✓ depersonalization check passed."
fi
exit "$fail"
