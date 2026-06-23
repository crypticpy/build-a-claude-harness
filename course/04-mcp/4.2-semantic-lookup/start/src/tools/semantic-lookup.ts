/**
 * semantic_lookup — return a file's stored summary + symbol list, NOT its bytes.
 *
 * Teaching point (Principle 5: distilled intelligence over raw bytes). When an
 * agent asks "what is this file?", it usually does not need the full source — it
 * needs a summary and the names it exports. Serving THAT instead of the file
 * saves tokens and keeps the model focused. This tool never reads file contents
 * at call time; it reads the pre-computed index.
 *
 * ── YOUR JOB ──────────────────────────────────────────────────────────────
 * ONE blank, marked `// TODO`, in the results map below. Everything else —
 * argument handling, path matching — is done. Diff against ../solution if stuck.
 */

import type { Store } from "../store.js";

export interface SemanticLookupArgs {
  /** A single repo-relative (or matchable) path. */
  path?: string;
  /** Or several at once. */
  paths?: string[];
}

interface LookupResult {
  path: string;
  found: boolean;
  summary?: string;
  symbols?: string[];
}

/**
 * Match a requested path against an indexed key. Index keys are repo-relative.
 * We accept an exact match, or a suffix match, so a caller can pass an absolute
 * path or a longer path and still hit the right entry.
 */
function matchKey(store: Store, requested: string): string | null {
  if (store.data.files[requested]) return requested;
  const norm = requested.replace(/\\/g, "/");
  for (const k of Object.keys(store.data.files)) {
    if (norm === k || norm.endsWith("/" + k) || k.endsWith("/" + norm)) {
      return k;
    }
  }
  return null;
}

export function semanticLookup(store: Store, args: SemanticLookupArgs): string {
  const requested = args.paths ?? (args.path ? [args.path] : []);
  if (requested.length === 0) {
    throw new Error(
      "semantic_lookup requires `path` (string) or `paths` (string[]).",
    );
  }

  const results: LookupResult[] = requested.map((p) => {
    const key = matchKey(store, p);
    if (!key) return { path: p, found: false };
    const entry = store.data.files[key];
    // TODO: return the DISTILLED answer for this file — its `summary` and its
    // `symbols` from `entry`, plus `path: key` and `found: true`. Do NOT return
    // file contents; the store holds none, and that is the whole point.
    // Hint: { path: key, found: true, summary: entry.summary, symbols: entry.symbols }
    return { path: key, found: true }; // <-- add summary + symbols from entry
  });

  return JSON.stringify({ results }, null, 2);
}
