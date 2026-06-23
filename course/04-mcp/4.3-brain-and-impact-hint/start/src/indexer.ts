/**
 * indexer.ts — a small, regex-based, language-tolerant repo indexer.
 *
 * It walks a target repo and, for each source file, records three cheap things:
 *   1. a summary  — the first comment/docstring, or the first few code lines
 *   2. symbols    — exported / top-level names (export function/const/class, def)
 *   3. imports    — raw import/require/from targets (the dependency edges)
 *
 * Deliberately NOT a real parser. Regex keeps it dependency-free and works well
 * enough across TS/JS/Python to teach the idea. (The reference also handles Go
 * and grouped imports; we trim those to keep the lesson readable.) Results go
 * to the Store. The whole point: compute distilled facts ONCE, serve them cheap.
 */

import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative, extname } from "node:path";
import type { Store, FileEntry } from "./store.js";

/** Extensions we treat as indexable source. */
const SOURCE_EXTS = new Set([
  ".ts",
  ".tsx",
  ".js",
  ".jsx",
  ".mjs",
  ".cjs",
  ".py",
]);

/** Directories we never descend into. */
const SKIP_DIRS = new Set([
  "node_modules",
  ".git",
  "dist",
  "build",
  ".store",
  "coverage",
  "__pycache__",
]);

const MAX_FILE_BYTES = 512 * 1024; // skip anything bigger; not worth indexing
const SUMMARY_LINES = 3; // how many code lines to fall back to

/** Recursively collect indexable source file paths under `dir`. */
function walk(dir: string, acc: string[]): void {
  let entries: string[];
  try {
    entries = readdirSync(dir);
  } catch {
    return; // unreadable dir — skip quietly
  }
  for (const name of entries) {
    const full = join(dir, name);
    let st;
    try {
      st = statSync(full);
    } catch {
      continue;
    }
    if (st.isDirectory()) {
      if (SKIP_DIRS.has(name)) continue;
      walk(full, acc);
    } else if (st.isFile()) {
      if (SOURCE_EXTS.has(extname(name)) && st.size <= MAX_FILE_BYTES) {
        acc.push(full);
      }
    }
  }
}

/** Squash whitespace and cap length so summaries stay token-cheap. */
function collapse(s: string): string {
  const out = s.replace(/\s+/g, " ").trim();
  return out.length > 240 ? out.slice(0, 237) + "..." : out;
}

/** Pull a human summary: leading comment/docstring, else first code lines. */
export function extractSummary(source: string): string {
  // Python triple-quoted docstring near the top.
  const docMatch = source.match(/^\s*("""|''')([\s\S]*?)\1/);
  if (docMatch && docMatch[2].trim()) return collapse(docMatch[2]);

  // A leading /** ... */ block comment.
  const blockMatch = source.match(/^\s*\/\*\*?([\s\S]*?)\*\//);
  if (blockMatch && blockMatch[1].trim()) {
    const cleaned = blockMatch[1]
      .split(/\r?\n/)
      .map((l) => l.replace(/^\s*\*\s?/, "").trim())
      .filter(Boolean)
      .join(" ");
    if (cleaned) return collapse(cleaned);
  }

  // Leading // or # line comments.
  const lineComments: string[] = [];
  for (const raw of source.split(/\r?\n/)) {
    const l = raw.trim();
    if (l === "") {
      if (lineComments.length) break;
      continue;
    }
    const m = l.match(/^(?:\/\/|#)\s?(.*)$/);
    if (m) lineComments.push(m[1]);
    else break;
  }
  if (lineComments.length) return collapse(lineComments.join(" "));

  // Fall back to the first few non-import, non-blank code lines.
  const codeLines = source
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l && !/^(import|from|export\s+\*)/.test(l))
    .slice(0, SUMMARY_LINES);
  return collapse(codeLines.join(" ")) || "(no summary available)";
}

/** Regex-extract exported / top-level declared symbol names. */
export function extractSymbols(source: string): string[] {
  const names = new Set<string>();
  const patterns: RegExp[] = [
    /export\s+(?:default\s+)?(?:async\s+)?function\s+([A-Za-z_$][\w$]*)/g,
    /export\s+(?:abstract\s+)?class\s+([A-Za-z_$][\w$]*)/g,
    /export\s+(?:const|let|var)\s+([A-Za-z_$][\w$]*)/g,
    /export\s+(?:type|interface|enum)\s+([A-Za-z_$][\w$]*)/g,
    /^\s*def\s+([A-Za-z_]\w*)/gm, // Python
    /^\s*class\s+([A-Za-z_]\w*)/gm, // Python
  ];
  for (const re of patterns) {
    let m: RegExpExecArray | null;
    while ((m = re.exec(source)) !== null) {
      if (m[1]) names.add(m[1]);
    }
  }
  return [...names];
}

/**
 * Strip comments before scanning for imports. Text inside a comment (e.g.
 * `// import fakelib from "x"`) is NOT a real dependency, so it must not become
 * an import edge. Cheap pre-pass — not a real lexer, but good enough here.
 */
function stripComments(source: string): string {
  return source
    .replace(/\/\*[\s\S]*?\*\//g, " ") // /* ... */ block comments
    .replace(/^([^\n]*?)\/\/.*$/gm, "$1") // // line comments (keep code before)
    .replace(/^([^\n]*?)#.*$/gm, "$1"); // # line comments (Python)
}

/** Regex-extract import/require/from targets (the raw module strings). */
export function extractImports(source: string): string[] {
  const code = stripComments(source);
  const targets = new Set<string>();
  const patterns: RegExp[] = [
    /import\s+[^'"]*?from\s+['"]([^'"]+)['"]/g, // import x from "y"
    /import\s+['"]([^'"]+)['"]/g, // import "y"
    /require\(\s*['"]([^'"]+)['"]\s*\)/g, // require("y")
    /^\s*from\s+(\.*[A-Za-z_.][\w.]*)\s+import\b/gm, // Python: from y import x
  ];
  for (const re of patterns) {
    let m: RegExpExecArray | null;
    while ((m = re.exec(code)) !== null) {
      if (m[1]) targets.add(m[1]);
    }
  }
  return [...targets];
}

export interface IndexResult {
  root: string;
  fileCount: number;
  symbolCount: number;
}

/** Index `root` into `store` and persist. Returns a small summary. */
export function indexRepo(store: Store, root: string): IndexResult {
  const files: string[] = [];
  walk(root, files);

  const fileMap: Record<string, FileEntry> = {};
  const importMap: Record<string, string[]> = {};
  let symbolCount = 0;

  for (const full of files) {
    let source: string;
    try {
      source = readFileSync(full, "utf8");
    } catch {
      continue;
    }
    const rel = relative(root, full).replace(/\\/g, "/");
    const symbols = extractSymbols(source);
    fileMap[rel] = { summary: extractSummary(source), symbols };
    importMap[rel] = extractImports(source);
    symbolCount += symbols.length;
  }

  store.data.root = root;
  store.data.files = fileMap;
  store.data.imports = importMap;
  store.save();

  return { root, fileCount: files.length, symbolCount };
}
