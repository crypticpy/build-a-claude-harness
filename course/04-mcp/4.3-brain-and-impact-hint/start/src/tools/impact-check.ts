/**
 * impact_check — "what breaks if I change this?"
 *
 * Teaching point: an import-edge map IS a cheap dependency graph. Given a file
 * (or an exported symbol), we scan the recorded import edges to find every file
 * that references it — its downstream consumers. That is the blast radius of a
 * change, computed without reading a single file or running a single test.
 */

import type { Store } from "../store.js";

export interface ImpactCheckArgs {
  /** Path of the file you intend to change. */
  path?: string;
  /** Or an exported symbol name to find references for. */
  symbol?: string;
}

const SRC_EXT = /\.(ts|tsx|js|jsx|mjs|cjs|py)$/i;

/** Collapse `.`/`..` segments in a slash path (a tiny POSIX path normalizer). */
function normalizeSlash(p: string): string {
  const out: string[] = [];
  for (const seg of p.split("/")) {
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
 * importing file's OWN directory, then compared to the candidate target. That
 * directory-awareness is what makes the answer correct — `../util/log` from one
 * folder is a different file than `util/log` from the root. We tolerate
 * `.js`<->`.ts` (TS rewrites extensions) and an implicit `/index`. Bare
 * specifiers (e.g. "react") are external packages and never match a local file.
 */
function importRefersToPath(
  importTarget: string,
  targetPath: string,
  consumerPath: string,
): boolean {
  const target = targetPath.replace(/\\/g, "/").replace(SRC_EXT, "");
  const spec = importTarget.replace(/\\/g, "/").replace(SRC_EXT, "");

  if (!spec.startsWith("./") && !spec.startsWith("../")) return false;

  const consumerDir = consumerPath.replace(/\\/g, "/").replace(/\/[^/]*$/, "");
  const resolved = normalizeSlash(
    (consumerDir ? consumerDir + "/" : "") + spec,
  );

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

  // symbol mode: a consumer is any file that imports a file which exports it.
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
