// Build-time syntax highlighting. Shiki runs in .astro/.mdx frontmatter only,
// so the highlighter and its grammars never reach a client bundle. One shared
// highlighter instance is created lazily and reused across every excerpt.
import { createHighlighter, type Highlighter } from "shiki";

const LANGS = ["javascript", "json", "bash", "typescript", "diff"] as const;
const THEME = "github-dark-default";

let hl: Highlighter | null = null;

async function get(): Promise<Highlighter> {
  if (!hl) {
    hl = await createHighlighter({
      themes: [THEME],
      langs: LANGS as unknown as string[],
    });
  }
  return hl;
}

export async function highlight(code: string, lang: string): Promise<string> {
  const h = await get();
  const known = (LANGS as readonly string[]).includes(lang) ? lang : "text";
  return h.codeToHtml(code.trimEnd(), {
    lang: known,
    theme: THEME,
    // The <pre> gets .shiki; we restyle it onto the vellum chrome in heva.css.
    transformers: [
      {
        pre(node) {
          node.properties["tabindex"] = "0";
        },
      },
    ],
  });
}
