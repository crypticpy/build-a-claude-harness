#!/usr/bin/env node
/**
 * Unified hook router — one script, many events.
 *
 * Instead of a separate file per event (hello-hook.mjs, format-lint.mjs, …),
 * we have ONE entry point. Claude Code passes the event name as the last
 * argument on the command line (argv[2]); we read it and dispatch to the right
 * branch. This is the "router" (or "dispatcher") pattern from lesson 0.2, and
 * it's the exact shape the reference harness uses for every event.
 *
 * A dispatcher is one script that handles many events by branching on the
 * event name it was passed.
 *
 * Compare this file's switch to the one in:
 *   reference/hooks/unified/unified-hook.mjs
 * Same idea, far fewer cases — yours grows one branch at a time.
 */

import { appendFileSync, readFileSync } from "node:fs";
import { join, extname } from "node:path";
import { homedir } from "node:os";

const LOG_FILE = join(homedir(), ".claude", "hello-hook.log");

// Read the JSON payload Claude Code writes to stdin (fd 0). Empty/malformed
// input degrades to {} — a hook never crashes on bad input.
function readEvent() {
  try {
    const input = readFileSync(0, "utf-8");
    return input ? JSON.parse(input) : {};
  } catch {
    return {};
  }
}

// --- Branch handlers: one small function per event. ---

// UserPromptSubmit: append the submitted prompt to the log (lesson 1.1's job).
function handlePrompt(event) {
  const prompt = event.prompt || "(no prompt text in payload)";
  appendFileSync(LOG_FILE, `${new Date().toISOString()}  prompt: ${prompt}\n`);
  console.log("router: logged your prompt");
}

// PostToolUse on Write|Edit: log which file was just edited. (The real harness
// also auto-formats it here — see format-lint below and the reference module.)
function handlePostEdit(event) {
  const filePath = event.tool_input?.file_path || "(unknown file)";
  appendFileSync(
    LOG_FILE,
    `${new Date().toISOString()}  edit: ${filePath} (${extname(filePath) || "no ext"})\n`,
  );
  console.log("router: logged an edit");
}

function main() {
  // The event name is the last word on the command line:
  //   node unified-hook.mjs prompt      -> argv[2] === "prompt"
  //   node unified-hook.mjs post-edit   -> argv[2] === "post-edit"
  const eventType = process.argv[2];
  if (!eventType) return;

  const event = readEvent();

  // The router: one switch, one case per event name.
  switch (eventType) {
    case "prompt":
      handlePrompt(event);
      break;
    case "post-edit":
      handlePostEdit(event);
      break;
    default:
      // Unknown event: do nothing, exit clean.
      break;
  }
}

try {
  main();
} catch {
  // Fail silent — never block the user's turn. (Lesson 1.3.)
}
process.exit(0);
