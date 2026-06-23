#!/usr/bin/env node
/**
 * format-lint.mjs — the SECOND standalone hook (the "before" picture).
 *
 * This runs on PostToolUse, matched to Write|Edit, and logs which file was just
 * edited. (A real format-lint would also run a formatter on the file; we keep
 * it to logging so the duplication with hello-hook.mjs is obvious.)
 *
 * Read this side by side with before-refactor/hello-hook.mjs and notice how
 * much is identical: the stdin read, the JSON parse, the appendFileSync, the
 * try/catch, the process.exit(0). THAT duplication is the problem the router
 * (../unified-hook.mjs) solves.
 */

import { appendFileSync, readFileSync } from "node:fs";
import { join, extname } from "node:path";
import { homedir } from "node:os";

const LOG_FILE = join(homedir(), ".claude", "hello-hook.log");

function readStdin() {
  try {
    return readFileSync(0, "utf-8");
  } catch {
    return "";
  }
}

function main() {
  let payload = {};
  try {
    const input = readStdin();
    payload = input ? JSON.parse(input) : {};
  } catch {
    payload = {};
  }

  const filePath = payload.tool_input?.file_path || "(unknown file)";
  const timestamp = new Date().toISOString();
  appendFileSync(LOG_FILE, `${timestamp}  edit: ${filePath} (${extname(filePath) || "no ext"})\n`);

  console.log("format-lint: logged an edit");
}

try {
  main();
} catch {
  /* fail silent */
}
process.exit(0);
