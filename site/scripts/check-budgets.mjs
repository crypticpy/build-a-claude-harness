// check-budgets.mjs — the JS weight gates, run against the built dist/.
// Per-island cap 35KB gz; total client JS per page cap 60KB gz. Reading routes
// must ship 0KB render-blocking framework JS (no hydration script at all).
import { readdirSync, readFileSync, statSync, existsSync } from 'node:fs';
import { gzipSync } from 'node:zlib';
import { fileURLToPath } from 'node:url';
import { dirname, resolve, join, relative } from 'node:path';

const scriptDir = dirname(fileURLToPath(import.meta.url));
const siteDir = resolve(scriptDir, '..');
const dist = join(siteDir, 'dist');

if (!existsSync(dist)) {
  console.error('check-budgets: dist/ not found — run `astro build` first');
  process.exit(2);
}

const ISLAND_CAP = 35 * 1024;
const PAGE_CAP = 60 * 1024;

const gz = (buf) => gzipSync(buf).length;
const kb = (n) => (n / 1024).toFixed(1) + 'KB';

// Every emitted JS chunk and its gzip size.
const jsFiles = [];
(function walk(dir) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p);
    else if (p.endsWith('.js')) jsFiles.push(p);
  }
})(dist);

const problems = [];

// 1. Per-chunk island cap.
for (const f of jsFiles) {
  const size = gz(readFileSync(f));
  if (size > ISLAND_CAP) problems.push(`island chunk ${relative(dist, f)} is ${kb(size)} > 35KB gz`);
}

// 2. Per-page total + 0KB-framework on reading routes.
// A page's JS = the chunks referenced by <script type="module" src> in its HTML.
const htmlFiles = [];
(function walk(dir) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p);
    else if (p.endsWith('.html')) htmlFiles.push(p);
  }
})(dist);

// A route is framework-bearing iff it hydrates a Preact island (<astro-island>).
// These PURE_READING routes are the prose surfaces that must stay 0KB-framework:
// the landing, the two phase overviews, and 404. Module pages and /viz/ pages
// may hydrate (a viz island is the point), but a framework on a landing is a
// regression and fails the gate.
const PURE_READING = new Set(['/', '/404.html', '/phase-1/', '/phase-2/']);
const RUNTIME = /(preact\.module|signals\.module|hooks\.module|client\.)[A-Za-z0-9_-]*\.js$/;

const resolveChunk = (url) => {
  const stripped = url.replace(/^.*?_astro\//, '_astro/');
  const p = join(dist, stripped);
  return existsSync(p) ? p : null;
};

for (const html of htmlFiles) {
  const txt = readFileSync(html, 'utf-8');
  const route = '/' + relative(dist, html).replace(/index\.html$/, '').replace(/\\/g, '/');
  const interactive = /<astro-island/.test(txt);

  // Every directly-referenced chunk: module scripts plus island component/renderer.
  const urls = new Set();
  for (const m of txt.matchAll(/<script[^>]*\bsrc="([^"]+\.js)"/g)) urls.add(m[1]);
  for (const m of txt.matchAll(/\b(?:component-url|renderer-url)="([^"]+\.js)"/g)) urls.add(m[1]);

  const counted = new Set();
  let total = 0;
  const add = (p) => {
    if (p && !counted.has(p)) {
      counted.add(p);
      total += gz(readFileSync(p));
    }
  };
  for (const u of urls) add(resolveChunk(u));
  // The Preact runtime is loaded transitively by the island; count it per page.
  if (interactive) for (const f of jsFiles) if (RUNTIME.test(f)) add(f);

  if (total > PAGE_CAP) problems.push(`page ${route} ships ${kb(total)} JS > 60KB gz`);
  if (PURE_READING.has(route) && interactive)
    problems.push(`reading route ${route} hydrates a framework island (must be 0KB framework)`);
}

if (problems.length) {
  console.error(`BUDGET VIOLATIONS (${problems.length}):`);
  for (const p of problems) console.error('  - ' + p);
  process.exit(problems.length);
}
console.log(`budgets ok — ${jsFiles.length} JS chunks, ${htmlFiles.length} routes within caps`);
