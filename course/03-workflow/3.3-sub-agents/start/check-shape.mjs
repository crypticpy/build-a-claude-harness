// check-shape.mjs — validate that an agent's report matches the expected shape.
//
// A sub-agent's contract is its OUTPUT SHAPE. You hand it one objective and the
// exact structure you want back; the value is that you can rely on that structure
// without re-reading the agent's reasoning. So the checkpoint here is structural:
// does the report carry the three required headers and a parseable Scope line?
//
// Fill the body of checkShape() below.
//
// Usage:
//   node check-shape.mjs ../fixtures/sample-report.md

import { readFileSync } from "node:fs";

const REQUIRED_HEADERS = ["## Code review", "**Blockers**:", "**Non-blockers**:"];

/**
 * Validate a report string against the required shape.
 * Collect a problem string for each missing header, and one if the
 * `**Scope**:` line is missing or doesn't state a file count.
 *
 * @param {string} report
 * @returns {{ ok: boolean, problems: string[], scope: string|null }}
 */
export function checkShape(report) {
  const problems = [];

  // TODO (blank 1): for each header in REQUIRED_HEADERS, push a problem if the
  // report does not include it.
  //   for (const header of REQUIRED_HEADERS) {
  //     if (!report.includes(header)) problems.push(`missing required header: ${header}`);
  //   }
  /* your loop here */

  // TODO (blank 2): match the Scope line — /\*\*Scope\*\*:\s*(.+)/ — into `scope`.
  // If absent, push "missing **Scope**: line". If present but it doesn't contain
  // a file count (test with /\d+\s+files?/), push a problem naming the scope text.
  let scope = null;
  /* your matching + checks here */

  return { ok: problems.length === 0, problems, scope };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const path = process.argv[2];
  if (!path) {
    console.error("usage: node check-shape.mjs <report.md>");
    process.exit(2);
  }
  const report = readFileSync(path, "utf-8");
  const { ok, problems, scope } = checkShape(report);
  if (ok) {
    console.log(`SHAPE OK — Scope: ${scope}`);
    process.exit(0);
  }
  console.error("SHAPE MISMATCH:");
  for (const p of problems) console.error(`  - ${p}`);
  process.exit(1);
}
