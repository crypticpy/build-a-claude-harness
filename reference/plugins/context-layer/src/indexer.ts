/**
 * indexer.ts — a small, regex-based, language-tolerant repo indexer.
 *
 * It walks a target repo and, for each source file, records three cheap things:
 *   1. a summary  — the first comment/docstring, or the first few code lines
 *   2. symbols    — exported names (export function/const/class, def, func, type)
 *   3. imports    — raw import/require/from targets (the dependency edges)
 *
 * Deliberately NOT a real parser. Regex keeps it dependency-free and works
 * across TS/JS/Python/Go well enough to teach the idea. Results go to the Store.
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
  ".go",
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
  ".venv",
  "venv",
  ".next",
  "out",
  "vendor",
]);

const MAX_FILE_BYTES = 512 * 1024; // skip anything bigger; it's not worth indexing
const SUMMARY_LINES = 3; // how many code lines to fall back to

/** Recursively collect indexable source file paths under `root`. */
function walk(root: string, dir: string, acc: string[]): void {
  let entries: string[];
  try {
    entries = readdirSync(dir);
  } catch {
    return; // unreadable dir — skip quietly
  }
  for (const name of entries) {
    if (name.startsWith(".") && name !== ".") {
      // skip dotfiles/dotdirs except we still allow explicit roots
      if (SKIP_DIRS.has(name)) continue;
    }
    const full = join(dir, name);
    let st;
    try {
      st = statSync(full);
    } catch {
      continue;
    }
    if (st.isDirectory()) {
      if (SKIP_DIRS.has(name)) continue;
      walk(root, full, acc);
    } else if (st.isFile()) {
      if (SOURCE_EXTS.has(extname(name)) && st.size <= MAX_FILE_BYTES) {
        acc.push(full);
      }
    }
  }
}

/** Pull a human summary: leading comment/docstring, else first code lines. */
export function extractSummary(source: string): string {
  const lines = source.split(/\r?\n/);

  // Python triple-quoted docstring near the top.
  const docMatch = source.match(/^\s*(?:[rubRUB]*)("""|''')([\s\S]*?)\1/);
  if (docMatch && docMatch[2].trim()) {
    return collapse(docMatch[2]);
  }

  // Leading // or # line comments, or a /** ... */ block.
  const blockMatch = source.match(/^\s*\/\*\*?([\s\S]*?)\*\//);
  if (blockMatch && blockMatch[1].trim()) {
    const cleaned = blockMatch[1]
      .split(/\r?\n/)
      .map((l) => l.replace(/^\s*\*\s?/, "").trim())
      .filter(Boolean)
      .join(" ");
    if (cleaned) return collapse(cleaned);
  }

  const lineComments: string[] = [];
  for (const raw of lines) {
    const l = raw.trim();
    if (l === "") {
      if (lineComments.length) break;
      continue;
    }
    const m = l.match(/^(?:\/\/|#)\s?(.*)$/);
    if (m) {
      lineComments.push(m[1]);
    } else {
      break;
    }
  }
  if (lineComments.length) return collapse(lineComments.join(" "));

  // Fall back to the first few non-import, non-blank code lines.
  const codeLines = lines
    .map((l) => l.trim())
    .filter((l) => l && !/^(import|from|export\s+\*|require\()/.test(l))
    .slice(0, SUMMARY_LINES);
  return collapse(codeLines.join(" ")) || "(no summary available)";
}

/** Squash whitespace and cap length so summaries stay token-cheap. */
function collapse(s: string): string {
  const out = s.replace(/\s+/g, " ").trim();
  return out.length > 280 ? out.slice(0, 277) + "..." : out;
}

/** Regex-extract exported / top-level declared symbol names. */
export function extractSymbols(source: string): string[] {
  const names = new Set<string>();
  const patterns: RegExp[] = [
    // TS/JS exports
    /export\s+(?:default\s+)?(?:async\s+)?function\s+([A-Za-z_$][\w$]*)/g,
    /export\s+(?:abstract\s+)?class\s+([A-Za-z_$][\w$]*)/g,
    /export\s+(?:const|let|var)\s+([A-Za-z_$][\w$]*)/g,
    /export\s+(?:type|interface|enum)\s+([A-Za-z_$][\w$]*)/g,
    // Python
    /^\s*def\s+([A-Za-z_]\w*)/gm,
    /^\s*class\s+([A-Za-z_]\w*)/gm,
    // Go
    /^\s*func\s+(?:\([^)]*\)\s*)?([A-Za-z_]\w*)/gm,
    /^\s*type\s+([A-Za-z_]\w*)\s+/gm,
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
 * Strip comments before scanning for imports.
 *
 * Why: text inside a comment (e.g. `// import fakelib from "x"`) is not a real
 * dependency, so it must not become an import edge. This is a cheap, language-
 * tolerant pre-pass — it blanks out /* ... *\/ block comments and // / # line
 * comments. It is not a real lexer (it doesn't track string literals), but for
 * the import patterns we run afterward that's good enough and dependency-free.
 */
function stripComments(source: string): string {
  return source
    .replace(/\/\*[\s\S]*?\*\//g, " ") // /* ... */ block comments
    .replace(/^([^\n]*?)\/\/.*$/gm, "$1") // // ... line comments (keep code before)
    .replace(/^([^\n]*?)#.*$/gm, "$1"); // # ... line comments (Python/shell)
}

/** Regex-extract import/require/from targets (the raw module strings). */
export function extractImports(source: string): string[] {
  // Comment text isn't a real dependency, so drop comments before matching.
  const code = stripComments(source);
  const targets = new Set<string>();
  const patterns: RegExp[] = [
    /import\s+[^'"]*?from\s+['"]([^'"]+)['"]/g, // TS/JS: import x from "y"
    /import\s+['"]([^'"]+)['"]/g, // TS/JS: import "y"
    /require\(\s*['"]([^'"]+)['"]\s*\)/g, // CJS: require("y")
    // Python: from y import x — allow a leading `.`+ for relative imports
    // (e.g. `from .helpers import thing`, `from ..pkg.mod import x`).
    /^\s*from\s+(\.*[A-Za-z_.][\w.]*)\s+import\b/gm,
    // Python/Go bare: `import y` — but NOT TS `import { ... }` / `import x from`
    // (no quote, no brace, no `type`/`*`/`from` after the module token).
    /^\s*import\s+([A-Za-z_][\w./]*)\s*$/gm,
  ];
  for (const re of patterns) {
    let m: RegExpExecArray | null;
    while ((m = re.exec(code)) !== null) {
      const t = m[1];
      if (t && t !== "type") targets.add(t);
    }
  }
  // Go grouped imports: `import ( "strings" \n "fmt" )` — the single-line
  // matcher above can't see these, so pull each quoted path from the block.
  const groupRe = /\bimport\s*\(([\s\S]*?)\)/g;
  let g: RegExpExecArray | null;
  while ((g = groupRe.exec(code)) !== null) {
    const body = g[1];
    const pathRe = /['"]([^'"]+)['"]/g;
    let p: RegExpExecArray | null;
    while ((p = pathRe.exec(body)) !== null) {
      if (p[1]) targets.add(p[1]);
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
  walk(root, root, files);

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
