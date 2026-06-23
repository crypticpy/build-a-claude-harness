#!/usr/bin/env node
/**
 * Unified hook router — one script, many events.
 *
 * You've written two standalone hooks now (hello-hook.mjs and format-lint.mjs)
 * and felt how much code they copy from each other. This file collapses both
 * into ONE entry point. Claude Code passes the event name as the last argument
 * (argv[2]); we read it and dispatch to the right branch — the "router" pattern
 * from lesson 0.2.
 *
 * FILL-IN-THE-BLANK: two TODOs below. The handlers are already written for you;
 * your job is to (1) read the event name and (2) route the post-edit event to
 * its handler. Diff against ../solution/unified-hook.mjs if you get stuck.
 */

import { appendFileSync, readFileSync } from "node:fs";
import { join, extname } from "node:path";
import { homedir } from "node:os";

const LOG_FILE = join(homedir(), ".claude", "hello-hook.log");

// Read the JSON payload Claude Code writes to stdin (fd 0).
function readEvent() {
  try {
    const input = readFileSync(0, "utf-8");
    return input ? JSON.parse(input) : {};
  } catch {
    return {};
  }
}

// --- Branch handlers (already written — read them, don't change them). ---

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
}

function main() {
  // TODO (1 of 2): the event name is the last word on the command line, e.g.
  //   node unified-hook.mjs prompt   -> we want the string "prompt"
  //   node unified-hook.mjs post-edit -> we want "post-edit"
  // process.argv is [nodePath, scriptPath, eventName]. The placeholder index 0
  // below points at the node path — wrong on purpose. Replace the 0 with the
  // index that picks out the event name.
  const eventType = process.argv[0]; // TODO: fix the index
  if (!eventType) return;

  const event = readEvent();

  switch (eventType) {
    case "prompt":
      handlePrompt(event);
      break;
    // TODO (2 of 2): add the case for the "post-edit" event so it calls
    // handlePostEdit(event). Model it on the "prompt" case directly above, and
    // don't forget the `break;`.

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
