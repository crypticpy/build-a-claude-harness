// quality-gate.mjs — a Stop-time gate that runs a check ONLY when files changed,
// and NEVER throws.
//
// On the Stop event (end of a turn), if files changed this turn, run the
// project's gate command (a type-check, a lint, a test). A failing gate SURFACES
// the failure so "done" doesn't slide past a broken check — but it must never
// throw and never hard-block Stop, or it would break every single turn.
//
// Simplified from reference/hooks/unified/modules/quality-gates.mjs. Two
// simplifications for a repeatable checkpoint:
//   - Change detection: the reference uses a git heuristic (`git diff`/`ls-files`).
//     Here we read a marker file `.changed` in the working dir, so the checkpoint
//     is deterministic without needing a throwaway git repo. Same shape: "did
//     anything change → should we bother running the gate."
//   - The gate command comes from a passed-in config object, defaulting to a
//     small, fast check.
//
// The result is returned as a structured object (never thrown) so a caller — and
// the checkpoint — can inspect what happened.
//
// Usage:
//   node quality-gate.mjs <work-dir>
//   -> prints the outcome; exit 0 always (a gate never crashes the turn).

import { existsSync } from "node:fs";
import { execSync } from "node:child_process";
import { join } from "node:path";

/** Did files change this turn? Marker-file stand-in for the git heuristic. */
export function hasFilesChanged(cwd) {
  return existsSync(join(cwd, ".changed"));
}

/**
 * Run the gate. Returns one of:
 *   { ran: false, reason: "no-change" }                 ← nothing changed, skipped
 *   { ran: true,  passed: true }                        ← check passed
 *   { ran: true,  passed: false, detail: <string> }     ← check FAILED (surfaced, not thrown)
 * Never throws.
 *
 * @param {string} cwd
 * @param {{ check?: string }} config  the gate command; null/absent = no gate
 */
export function runGate(cwd, config = {}) {
  try {
    if (!hasFilesChanged(cwd)) {
      return { ran: false, reason: "no-change" };
    }
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
    // Anything unexpected (bad cwd, etc.) — fail silent. A gate never breaks Stop.
    return { ran: false, reason: "gate-error" };
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const cwd = process.argv[2] || process.cwd();
  // Default gate: run the check script the fixture scenario ships, if present.
  const config = { check: process.env.GATE_CHECK || "node check.mjs" };
  const result = runGate(cwd, config);

  if (!result.ran) {
    console.log(`[quality-gate] skipped (${result.reason}) — nothing to verify.`);
  } else if (result.passed) {
    console.log("[quality-gate] check passed.");
  } else {
    // Surface the failure to stderr so "done" doesn't slide past it.
    console.error("[quality-gate] CHECK FAILED — do not call this done:");
    console.error(result.detail);
  }
  // ALWAYS exit 0: the gate reports, it does not crash the turn.
  process.exit(0);
}
