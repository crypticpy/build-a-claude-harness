/**
 * semantic_lookup — return a file's stored summary + symbol list, NOT its bytes.
 *
 * Teaching point: when an agent asks "what is this file?", it usually does not
 * need the full source — it needs a summary and the symbols it exports. Serving
 * that instead of raw contents saves tokens and keeps the model focused.
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
 * Match a requested path against an indexed key.
 * Index keys are repo-relative. We accept an exact match, or a suffix match
 * so callers can pass an absolute path or a longer path and still hit.
 */
function matchKey(store: Store, requested: string): string | null {
  const keys = Object.keys(store.data.files);
  if (store.data.files[requested]) return requested;
  // normalize separators for tolerance
  const norm = requested.replace(/\\/g, "/");
  for (const k of keys) {
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
    return {
      path: key,
      found: true,
      summary: entry.summary,
      symbols: entry.symbols,
    };
  });

  return JSON.stringify({ results }, null, 2);
}
