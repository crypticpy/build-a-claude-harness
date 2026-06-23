/**
 * impact_check — "what breaks if I change this?"
 *
 * Teaching point: an import-edge map is a cheap dependency graph. Given a file
 * (or an exported symbol), we scan the recorded import edges to find every file
 * that references it — its downstream consumers. That is the blast radius of a
 * change, computed without running a single test.
 */

import type { Store } from "../store.js";

export interface ImpactCheckArgs {
  /** Path of the file you intend to change. */
  path?: string;
  /** Or an exported symbol name to find references for. */
  symbol?: string;
}

const SRC_EXT = /\.(ts|tsx|js|jsx|mjs|cjs|py|go)$/i;

/** Collapse `.`/`..` segments in a slash path (a tiny POSIX path normalizer). */
function normalizeSlash(p: string): string {
  const parts = p.split("/");
  const out: string[] = [];
  for (const seg of parts) {
    if (seg === "" || seg === ".") continue;
    if (seg === "..") {
      if (out.length && out[out.length - 1] !== "..") out.pop();
      else out.push("..");
    } else {
      out.push(seg);
    }
  }
  return out.join("/");
}

/**
 * Does `importTarget`, written inside `consumerPath`, resolve to `targetPath`?
 *
 * Resolution rule: a relative specifier (`./` or `../`) is resolved against the
 * importing file's own directory, then compared to the candidate target. This is
 * what makes the result directory-aware — `../utils/log.js` from one folder is a
 * different file than `core/log.ts`, even though both basenames are `log`. We
 * tolerate `.js`↔`.ts` (ESM TS rewrites extensions) and `/index` resolution.
 * Bare (non-relative) specifiers are treated as package imports and never match
 * a local file path here.
 */
function importRefersToPath(
  importTarget: string,
  targetPath: string,
  consumerPath: string,
): boolean {
  const target = targetPath.replace(/\\/g, "/").replace(SRC_EXT, "");
  let spec = importTarget.replace(/\\/g, "/").replace(SRC_EXT, "");

  // Only relative specifiers can name a file in this repo; bare specifiers
  // (e.g. "react", "strings") are external packages — not a local edge.
  if (!spec.startsWith("./") && !spec.startsWith("../")) return false;

  // Resolve the specifier against the consumer file's directory.
  const consumerDir = consumerPath.replace(/\\/g, "/").replace(/\/[^/]*$/, ""); // drop the filename
  const resolved = normalizeSlash(
    (consumerDir ? consumerDir + "/" : "") + spec,
  );

  // Compare, tolerating an implicit `/index` on either side.
  const targetNoIndex = target.replace(/\/index$/i, "");
  const resolvedNoIndex = resolved.replace(/\/index$/i, "");
  return (
    resolved === target ||
    resolvedNoIndex === target ||
    resolved === targetNoIndex ||
    resolvedNoIndex === targetNoIndex
  );
}

export function impactCheck(store: Store, args: ImpactCheckArgs): string {
  if (!args.path && !args.symbol) {
    throw new Error(
      "impact_check requires `path` (string) or `symbol` (string).",
    );
  }

  const consumers: string[] = [];

  if (args.path) {
    for (const [consumer, targets] of Object.entries(store.data.imports)) {
      if (consumer === args.path) continue; // a file does not consume itself
      if (targets.some((t) => importRefersToPath(t, args.path!, consumer))) {
        consumers.push(consumer);
      }
    }
    return JSON.stringify(
      { target: args.path, kind: "file", consumers: consumers.sort() },
      null,
      2,
    );
  }

  // symbol mode: find files that (a) define it elsewhere or (b) mention it.
  // Cheap heuristic: a consumer is any file whose import targets resolve to a
  // file that exports the symbol.
  const sym = args.symbol!;
  const definingFiles = Object.entries(store.data.files)
    .filter(([, e]) => e.symbols.includes(sym))
    .map(([p]) => p);

  for (const [consumer, targets] of Object.entries(store.data.imports)) {
    for (const def of definingFiles) {
      if (
        consumer !== def &&
        targets.some((t) => importRefersToPath(t, def, consumer))
      ) {
        consumers.push(consumer);
        break;
      }
    }
  }

  return JSON.stringify(
    {
      target: sym,
      kind: "symbol",
      definedIn: definingFiles.sort(),
      consumers: [...new Set(consumers)].sort(),
    },
    null,
    2,
  );
}
