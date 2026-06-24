import { defineConfig } from 'astro/config';
import preact from '@astrojs/preact';
import mdx from '@astrojs/mdx';

// Project site served at https://crypticpy.github.io/build-a-claude-harness/.
// `base` is the path prefix every internal URL must carry; the href() helper is
// the only sanctioned way to build one (root-absolute URLs are lint-banned).
export default defineConfig({
  site: 'https://crypticpy.github.io',
  base: '/build-a-claude-harness/',
  output: 'static',
  trailingSlash: 'ignore',
  integrations: [preact(), mdx()],
  build: { assets: '_astro' },
  devToolbar: { enabled: false },
});
