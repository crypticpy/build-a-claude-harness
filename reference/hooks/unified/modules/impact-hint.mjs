/**
 * Impact hint — push, don't pull.
 *
 * After an Edit/Write on a likely-public-API file, do a cheap grep for import
 * sites and, if there are any, print a one-line reminder that this file has
 * consumers. The model then decides whether the change actually touched exports
 * and whether a deeper impact check is warranted — without having to remember
 * to ask first.
 *
 * Heuristics (tuned for a typical web/app layout — adjust the patterns to your
 * own conventions):
 *   - Skip tests, type decls, config, and build output.
 *   - Only fire for lib / types / hooks / api-route paths, where exports are
 *     most often consumed elsewhere.
 *
 * Fail silent: any error returns null. A hint is never worth blocking an edit.
 */

import { execSync } from "node:child_process";
import { existsSync } from "node:fs";
import { basename, extname, relative, isAbsolute } from "node:path";

const HIGH_IMPACT_PATTERNS = [
  /^lib\/[^/]+\.(ts|tsx|js|mjs|jsx)$/,
  /^lib\/(?!__tests__\/)[^/]+\/(?!__tests__\/)[^/]+\.(ts|tsx|js|mjs|jsx)$/,
  /^types\/[^/]+\.(ts|tsx)$/,
  /^hooks\/(?!__tests__\/)[^/]+\.(ts|tsx)$/,
  /^app\/api\/[^/]+\/route\.(ts|js)$/,
  /^app\/api\/[^/]+\/[^/]+\/route\.(ts|js)$/,
];

const SKIP_PATTERNS = [
  /__tests__/,
  /\.test\./,
  /\.spec\./,
  /\.d\.ts$/,
  /\.config\./,
  /node_modules/,
  /\.next/,
  /dist\//,
  /coverage\//,
];

function isInScope(relPath) {
  if (SKIP_PATTERNS.some((p) => p.test(relPath))) return false;
  return HIGH_IMPACT_PATTERNS.some((p) => p.test(relPath));
}

/** Grep for files that import this module; return the matching paths. */
function countImporters(cwd, relPath) {
  const ext = extname(relPath);
  const stem = relPath.slice(0, -ext.length);
  const fileBasename = basename(relPath, ext);

  // Match two import forms: the `@/lib/foo` alias style and a loose relative
  // import ending in the basename.
  const aliasForm = `@/${stem}`;
  const looseForm = `/${fileBasename}['"]`;

  try {
    // Single-quote shell args so regex metacharacters are never interpreted.
    // Wrapping in single quotes neutralizes every shell/regex metacharacter a
    // filename might contain ($, *, `, ;, etc.); the `'\''` dance closes the
    // quote, emits a literal quote, and reopens it — the one char single quotes
    // can't escape on their own — so the shell sees the path verbatim.
    const sq = (s) => `'${s.replace(/'/g, `'\\''`)}'`;
    const cmd =
      `rg -l --type typescript --type js ` +
      `-e ${sq(aliasForm)} ` +
      `-e ${sq(looseForm)} ` +
      `app components lib hooks types middleware.ts 2>/dev/null | ` +
      `grep -v ${sq(relPath)} | ` +
      `head -20`;
    const out = execSync(cmd, { cwd, encoding: "utf-8", timeout: 3000, shell: "/bin/bash" });
    return out.trim().split("\n").filter(Boolean);
  } catch {
    return [];
  }
}

export async function emitHint(event, _config) {
  try {
    const toolName = event.tool_name;
    if (toolName !== "Edit" && toolName !== "Write") return null;

    const filePath = event.tool_input?.file_path;
    if (!filePath) return null;

    const cwd = process.env.CLAUDE_PROJECT_DIR || process.cwd();
    if (!cwd || !existsSync(cwd)) return null;

    const relPath = isAbsolute(filePath) ? relative(cwd, filePath) : filePath;
    if (relPath.startsWith("..")) return null; // outside the repo

    if (!isInScope(relPath)) return null;

    const importers = countImporters(cwd, relPath);
    if (importers.length === 0) return null;

    const sample = importers.slice(0, 3).join(", ");
    const more = importers.length > 3 ? ` (+${importers.length - 3} more)` : "";
    return `Impact hint: ${relPath} is imported by ${importers.length} file${
      importers.length === 1 ? "" : "s"
    }: ${sample}${more}. If you changed any exports, check those consumers before continuing.`;
  } catch (err) {
    if (process.env.DEBUG) console.error("[impact-hint]", err);
    return null;
  }
}
