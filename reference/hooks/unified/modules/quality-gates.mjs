/**
 * Quality gates — run on Stop (end of turn).
 *
 * If files changed this turn, run the configured gate for the project's stack
 * (e.g. `tsc --noEmit` when a tsconfig.json is present). A failing gate prints
 * a warning to stderr; it never throws and never blocks the Stop event.
 *
 * The change check is a cheap git heuristic: no uncommitted/untracked changes
 * means there's nothing to type-check, so we skip the gate entirely. When git
 * isn't available we err on the side of running it.
 */

import { execSync } from "node:child_process";
import { existsSync } from "node:fs";

/** True if the working tree has changes (or git is unavailable — run anyway). */
function hasFilesChanged(cwd) {
  try {
    const diff = execSync("git diff --name-only HEAD 2>/dev/null || git diff --name-only", {
      cwd,
      timeout: 5000,
      encoding: "utf-8",
      stdio: ["pipe", "pipe", "pipe"],
    }).trim();

    const untracked = execSync("git ls-files --others --exclude-standard", {
      cwd,
      timeout: 5000,
      encoding: "utf-8",
      stdio: ["pipe", "pipe", "pipe"],
    }).trim();

    return diff.length > 0 || untracked.length > 0;
  } catch {
    // Not a git repo (or git failed) — don't suppress the gate.
    return true;
  }
}

export async function runGates(_event, config) {
  try {
    if (!config.qualityGates?.onStop?.enabled) return;

    const commands = config.qualityGates.onStop.commands || {};
    const cwd = process.env.CLAUDE_PROJECT_DIR || process.cwd();

    // Nothing edited this turn → nothing to check.
    if (!hasFilesChanged(cwd)) {
      if (process.env.DEBUG) console.error("[quality-gates] no changes, skipping");
      return;
    }

    // TypeScript: only when the project actually has a tsconfig.
    if (commands.typescript && existsSync(`${cwd}/tsconfig.json`)) {
      try {
        execSync(commands.typescript, { cwd, timeout: 30000, stdio: "inherit" });
      } catch {
        console.error("TypeScript check failed");
      }
    }

    // Fallback gate for any stack (null = no gate).
    if (commands.default) {
      try {
        execSync(commands.default, { cwd, timeout: 30000, stdio: "inherit" });
      } catch {
        console.error("Quality gate check failed");
      }
    }
  } catch {
    /* fail silent — never break Stop */
  }
}
