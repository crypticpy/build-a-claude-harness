// quality-gate.mjs — a Stop-time gate that runs a check ONLY when files changed,
// and NEVER throws.
//
// On the Stop event (end of a turn), if files changed this turn, run the
// project's gate command (a type-check, a lint, a test). A failing gate SURFACES
// the failure so "done" doesn't slide past a broken check — but it must never
// throw and never hard-block Stop, or it would break every single turn.
//
// Simplified from reference/hooks/unified/modules/quality-gates.mjs. Change
// detection here reads a marker file `.changed` (a deterministic stand-in for
// the reference's git heuristic). Fill the two function bodies marked `// TODO`.
//
// Usage:
//   node quality-gate.mjs <work-dir>

import { existsSync } from "node:fs";
import { execSync } from "node:child_process";
import { join } from "node:path";

/**
 * Did files change this turn? Marker-file stand-in for the git heuristic.
 * @returns {boolean}  true if a `.changed` file exists in cwd
 */
export function hasFilesChanged(cwd) {
  // TODO (blank 1): return whether `${cwd}/.changed` exists.
  //   return existsSync(join(cwd, ".changed"));
  /* your one line here */
}

/**
 * Run the gate. Returns one of:
 *   { ran: false, reason: "no-change" }                 ← nothing changed, skipped
 *   { ran: true,  passed: true }                        ← check passed
 *   { ran: true,  passed: false, detail: <string> }     ← check FAILED (surfaced, not thrown)
 * Never throws.
 *
 * @param {string} cwd
 * @param {{ check?: string }} config
 */
export function runGate(cwd, config = {}) {
  try {
    // TODO (blank 2): if nothing changed, return { ran: false, reason: "no-change" }.
    // This is the heart of the gate: a clean tree is a NO-OP. Skip the expensive
    // check entirely when there's nothing to verify.
    /* your guard here */

    const check = config.check;
    if (!check) {
      return { ran: false, reason: "no-gate-configured" };
    }
    try {
      execSync(check, { cwd, timeout: 30000, stdio: ["pipe", "pipe", "pipe"] });
      return { ran: true, passed: true };
    } catch (err) {
      // The check exited non-zero. SURFACE it — do not rethrow.
      const detail = (err.stderr?.toString() || err.stdout?.toString() || err.message || "")
        .trim()
        .split("\n")
        .slice(-3)
        .join("\n");
      return { ran: true, passed: false, detail };
    }
  } catch {
    // Anything unexpected — fail silent. A gate never breaks Stop.
    return { ran: false, reason: "gate-error" };
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const cwd = process.argv[2] || process.cwd();
  const config = { check: process.env.GATE_CHECK || "node check.mjs" };
  const result = runGate(cwd, config);

  if (!result.ran) {
    console.log(`[quality-gate] skipped (${result.reason}) — nothing to verify.`);
  } else if (result.passed) {
    console.log("[quality-gate] check passed.");
  } else {
    console.error("[quality-gate] CHECK FAILED — do not call this done:");
    console.error(result.detail);
  }
  // ALWAYS exit 0: the gate reports, it does not crash the turn.
  process.exit(0);
}
