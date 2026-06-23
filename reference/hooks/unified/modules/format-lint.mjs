/**
 * Format on save.
 *
 * After a Write or Edit, look up a formatter for the file's extension in
 * config.formatting.extensions and run it on the file. JS/TS entries use `npx`
 * so no global install is required.
 *
 * Best-effort by design: if formatting is disabled, the extension has no
 * configured formatter, or the formatter isn't installed, this is a silent
 * no-op. A formatter must never block or fail an edit.
 */

import { execSync } from "node:child_process";
import { extname } from "node:path";

export async function formatFile(event, config) {
  try {
    if (!config.formatting?.enabled) return;

    const filePath = event.tool_input?.file_path;
    if (!filePath) return;

    const ext = extname(filePath);
    const formatter = config.formatting.extensions?.[ext];
    if (!formatter) return;

    try {
      execSync(`${formatter} "${filePath}" 2>/dev/null`, { timeout: 5000 });
    } catch {
      /* formatter missing or non-zero exit — best-effort, ignore */
    }
  } catch {
    /* fail silent */
  }
}
