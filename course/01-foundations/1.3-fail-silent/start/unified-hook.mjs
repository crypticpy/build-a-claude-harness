#!/usr/bin/env node
/**
 * Unified hook router — made FAIL-SILENT.
 *
 * Same router from lesson 1.2, hardened with the three rules:
 *   RULE 1 — always exit 0 (already in place at the bottom).
 *   RULE 2 — wrap the work in try/catch (already in place around main()).
 *   RULE 3 — guard optional dependencies (YOUR job, the TODO below).
 *
 * FILL-IN-THE-BLANK: one TODO, in handlePostEdit. Diff against
 * ../solution/unified-hook.mjs if stuck.
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

function handlePostEdit(event) {
  const filePath = event.tool_input?.file_path || "(unknown file)";
  appendFileSync(
    LOG_FILE,
    `${new Date().toISOString()}  edit: ${filePath} (${extname(filePath) || "no ext"})\n`,
  );
  console.log("router: logged an edit");

  // We'd like to format the file with `prettier`, but it may not be installed.
  // TODO (1 of 1): guard the formatting on the optional dependency. Wrap the
  // block below in `if (isToolAvailable("prettier")) { ... }` so that when
  // prettier is MISSING, this whole feature is a silent no-op (no crash, no
  // warning). isToolAvailable is defined just below for you.
  try {
    execSync(`prettier --write "${filePath}" 2>/dev/null`, { timeout: 5000 });
    console.log("router: formatted the edit");
  } catch {
    /* formatter errored — best-effort, ignore */
  }
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
  main(); // RULE 2 — all work behind one try/catch.
} catch (err) {
  if (process.env.DEBUG) console.error("[unified-hook]", err);
}
process.exit(0); // RULE 1 — always exit 0.
