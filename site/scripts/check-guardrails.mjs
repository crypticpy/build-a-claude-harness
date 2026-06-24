// check-guardrails.mjs — the project bans, enforced across the source tree.
// Scans .astro / .ts / .tsx / .css under src/ for the patterns the design
// system forbids. Exit code = violation count (CI gate).
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve, join, extname, relative } from 'node:path';

const scriptDir = dirname(fileURLToPath(import.meta.url));
const siteDir = resolve(scriptDir, '..');
const srcDir = join(siteDir, 'src');

const FILES = [];
(function walk(dir) {
  for (const name of readdirSync(dir)) {
    if (name === 'generated' || name === 'node_modules') continue;
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p);
    else if (['.astro', '.ts', '.tsx', '.js', '.jsx', '.css'].includes(extname(p))) FILES.push(p);
  }
})(srcDir);

const violations = [];
const flag = (file, line, rule, text) =>
  violations.push({ file: relative(siteDir, file), line, rule, text: text.trim().slice(0, 90) });

const BANNED_IMPORTS = /from\s+['"](react|react-dom|reactflow|react-flow|gsap)['"]/;
const isClientFile = (p) => p.endsWith('.tsx') || p.endsWith('.jsx');
// Skip prose: comment lines (where an illustrative "href=/x" is documentation,
// not shipped markup) are not scanned for the attribute-shape rules.
const isComment = (s) => /^\s*(\/\/|\*|\/\*|<!--)/.test(s);

for (const file of FILES) {
  const lines = readFileSync(file, 'utf-8').split('\n');
  lines.forEach((ln, i) => {
    const n = i + 1;
    if (isComment(ln)) return;
    // React / React Flow / GSAP are banned everywhere (Preact-only islands).
    if (BANNED_IMPORTS.test(ln)) flag(file, n, 'banned-framework-import', ln);
    // Never eager-hydrate; client:visible only.
    if (/client:load/.test(ln)) flag(file, n, 'client:load (use client:visible)', ln);
    // d3 is build-time only; never inside a client island.
    if (isClientFile(file) && /from\s+['"]d3(-[a-z]+)?['"]/.test(ln))
      flag(file, n, 'd3 import inside client island', ln);
    // The blur filter is banned (perf + the glow must be a baked gradient).
    if (/filter\s*:\s*[^;]*blur\s*\(/.test(ln)) flag(file, n, 'filter: blur()', ln);
    // Root-absolute internal URLs break the base path; use href().
    if (/(?:href|src)\s*=\s*["']\/(?!\/)/.test(ln) && !/href=\{/.test(ln))
      flag(file, n, 'root-absolute URL (use href())', ln);
  });
}

if (violations.length) {
  console.error(`GUARDRAIL VIOLATIONS (${violations.length}):`);
  for (const v of violations) console.error(`  ${v.file}:${v.line}  [${v.rule}]  ${v.text}`);
  process.exit(violations.length);
}
console.log(`guardrails clean — ${FILES.length} files scanned`);
