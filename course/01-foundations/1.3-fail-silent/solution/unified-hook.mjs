#!/usr/bin/env node
/**
 * Unified hook router — now made FAIL-SILENT on purpose.
 *
 * A hook runs inside your turn. If it throws and exits non-zero, it can block
 * or disrupt that turn — a bug in a logging script should never cost you your
 * actual work. So every hook follows three rules:
 *
 *   RULE 1 — ALWAYS EXIT 0. The last line is process.exit(0), reached on every
 *            path. A non-zero exit is how a hook signals "stop"; we never want
 *            that from best-effort work.
 *
 *   RULE 2 — WRAP THE WORK IN try/catch. A thrown error is caught and
 *            swallowed (optionally logged to stderr under DEBUG), so it can't
 *            escape to the exit code.
 *
 *   RULE 3 — GUARD OPTIONAL DEPENDENCIES. If a feature needs a tool, file, or
 *            API key that may not be present, check first and no-op when it's
 *            missing. A missing optional dependency is a normal state, not an
 *            error.
 *
 * This is the same router from lesson 1.2 with a deliberately risky branch
 * added ("post-edit"), so you can watch the rules absorb a real failure.
 * Compare to reference/hooks/unified/unified-hook.mjs, whose header calls these
 * exact ideas "FAIL SILENT" and "LAZY LOADING".
 */

import { appendFileSync, readFileSync } from "node:fs";
import { join, extname } from "node:path";
import { homedir } from "node:os";
import { execSync } from "node:child_process";

const LOG_FILE = join(homedir(), ".claude", "hello-hook.log");

function readEvent() {
  try {
    const input = readFileSync(0, "utf-8");
    return input ? JSON.parse(input) : {};
  } catch {
    return {};
  }
}

function handlePrompt(event) {
  const prompt = event.prompt || "(no prompt text in payload)";
  appendFileSync(LOG_FILE, `${new Date().toISOString()}  prompt: ${prompt}\n`);
  console.log("router: logged your prompt");
}

/**
 * PostToolUse on Write|Edit: log the edit, then OPTIONALLY format the file.
 * Formatting needs an external tool (prettier) that may not be installed — the
 * perfect place to show RULE 3, the optional-dependency guard.
 */
function handlePostEdit(event) {
  const filePath = event.tool_input?.file_path || "(unknown file)";
  appendFileSync(
    LOG_FILE,
    `${new Date().toISOString()}  edit: ${filePath} (${extname(filePath) || "no ext"})\n`,
  );
  console.log("router: logged an edit");

  // RULE 3 — optional dependency guard. We'd like to format the file, but only
  // if a formatter is actually available. Probe for it; if it's missing, this
  // whole feature quietly turns off. No crash, no warning spam, no blocked turn.
  if (isToolAvailable("prettier")) {
    try {
      execSync(`prettier --write "${filePath}" 2>/dev/null`, { timeout: 5000 });
      console.log("router: formatted the edit");
    } catch {
      /* formatter ran but errored — still best-effort, ignore */
    }
  }
  // If prettier isn't installed, we simply did nothing extra. That is the
  // correct behavior, not a failure.
}

/** Is a command-line tool on PATH? Returns false instead of throwing. */
function isToolAvailable(tool) {
  try {
    execSync(`command -v ${tool}`, { stdio: "ignore" });
    return true;
  } catch {
    return false;
  }
}

function main() {
  const eventType = process.argv[2];
  if (!eventType) return;

  const event = readEvent();

  switch (eventType) {
    case "prompt":
      handlePrompt(event);
      break;
    case "post-edit":
      handlePostEdit(event);
      break;
    default:
      break;
  }
}

try {
  // RULE 2 — all work behind one try/catch.
  main();
} catch (err) {
  // Swallow. Surface it only when the user opts into DEBUG, never to the user's
  // turn. A logging hook must not be able to break the session.
  if (process.env.DEBUG) console.error("[unified-hook]", err);
}
// RULE 1 — always exit 0. Every path lands here.
process.exit(0);
