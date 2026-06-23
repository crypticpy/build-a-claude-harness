// check-shape.mjs — validate that an agent's report matches the expected shape.
//
// A sub-agent's contract is its OUTPUT SHAPE. You hand it one objective and the
// exact structure you want back; the value is that you can rely on that structure
// without re-reading the agent's reasoning. So the checkpoint here is structural:
// does the report carry the three required headers and a parseable Scope line?
//
// This mirrors how a real harness consumes agent output — it pulls fields out of
// a known shape rather than free-prose. The agent (code-reviewer.md) is told to
// ALWAYS emit all three headers so this check is deterministic.
//
// Usage:
//   node check-shape.mjs ../fixtures/sample-report.md
//   -> "SHAPE OK" + exit 0, or lists the missing pieces + exit 1.

import { readFileSync } from "node:fs";

const REQUIRED_HEADERS = ["## Code review", "**Blockers**:", "**Non-blockers**:"];

/**
 * Validate a report string against the required shape.
 * @returns {{ ok: boolean, problems: string[], scope: string|null }}
 */
export function checkShape(report) {
  const problems = [];

  for (const header of REQUIRED_HEADERS) {
    if (!report.includes(header)) problems.push(`missing required header: ${header}`);
  }

  // The Scope line must exist and name a file/line count, e.g. "2 files, 31 changed lines".
  const scopeMatch = report.match(/\*\*Scope\*\*:\s*(.+)/);
  let scope = null;
  if (!scopeMatch) {
    problems.push("missing **Scope**: line");
  } else {
    scope = scopeMatch[1].trim();
    if (!/\d+\s+files?/.test(scope)) {
      problems.push(`**Scope**: line does not state a file count: "${scope}"`);
    }
  }

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
