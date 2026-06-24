// The ONLY sanctioned way to build an internal URL. Root-absolute literals
// (href="/phase-1") are lint-banned because they break under the /<repo>/ base
// path on GitHub Pages. import.meta.env.BASE_URL is Astro's configured base and
// always ends in a slash.
const BASE = import.meta.env.BASE_URL;

export function href(path = ""): string {
  const clean = String(path).replace(/^\/+/, "");
  const base = BASE.endsWith("/") ? BASE : BASE + "/";
  return base + clean;
}
