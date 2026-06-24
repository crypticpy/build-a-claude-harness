// check-links.mjs — every internal link in the built dist/ must resolve.
import { readdirSync, readFileSync, statSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve, join, relative } from 'node:path';

const scriptDir = dirname(fileURLToPath(import.meta.url));
const siteDir = resolve(scriptDir, '..');
const dist = join(siteDir, 'dist');
const BASE = '/build-a-claude-harness/';

if (!existsSync(dist)) {
  console.error('check-links: dist/ not found — run `astro build` first');
  process.exit(2);
}

const htmlFiles = [];
(function walk(dir) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p);
    else if (p.endsWith('.html')) htmlFiles.push(p);
  }
})(dist);

const dead = [];
for (const html of htmlFiles) {
  const txt = readFileSync(html, 'utf-8');
  const targets = [...txt.matchAll(/(?:href|src)="([^"]+)"/g)].map((m) => m[1]);
  for (const t of targets) {
    if (/^(https?:|mailto:|tel:|#|data:)/.test(t)) continue;
    if (!t.startsWith(BASE)) continue; // external-origin or odd; skip
    const rel = t.slice(BASE.length).split('#')[0].split('?')[0];
    if (!rel) continue;
    const direct = join(dist, rel);
    const asDir = join(dist, rel, 'index.html');
    const asHtml = join(dist, rel.endsWith('/') ? rel.slice(0, -1) : rel) + '.html';
    if (!existsSync(direct) && !existsSync(asDir) && !existsSync(asHtml)) {
      dead.push(`${relative(dist, html)} -> ${t}`);
    }
  }
}

if (dead.length) {
  console.error(`DEAD LINKS (${dead.length}):`);
  for (const d of dead) console.error('  - ' + d);
  process.exit(dead.length);
}
console.log(`links ok — ${htmlFiles.length} routes checked`);
