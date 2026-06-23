#!/usr/bin/env node
/**
 * Hello, hook — your first Claude Code hook.
 *
 * Claude Code runs this file on the UserPromptSubmit event (you wire that up in
 * settings.json). It hands us a JSON payload on stdin describing the prompt you
 * just submitted. We read that payload, then append one line to a log file so
 * we have proof the hook ran.
 *
 * This is a FILL-IN-THE-BLANK skeleton. Find the two TODOs below and complete
 * them. Everything else already works. Diff against ../solution/ if you get
 * stuck.
 */

import { appendFileSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { homedir } from "node:os";

// Where we write our proof-of-life line. Lives under the user's home dir so the
// code is portable — never hardcode an absolute path.
const LOG_FILE = join(homedir(), ".claude", "hello-hook.log");

// Read all of standard input. Claude Code writes the JSON payload to fd 0.
// Hooks are short-lived, so a synchronous read is fine and keeps this simple.
function readStdin() {
  try {
    return readFileSync(0, "utf-8");
  } catch {
    return "";
  }
}

function main() {
  // 1. Read the payload from stdin and parse it. Empty or malformed input
  //    degrades to {} — we never crash on bad input.
  let payload = {};
  try {
    const input = readStdin();
    payload = input ? JSON.parse(input) : {};
  } catch {
    payload = {};
  }

  // 2. Pull out the bit we care about.
  //    TODO (1 of 2): the prompt text lives on a field of the payload. Replace
  //    `payload.____` with the right field name. (Hint: the UserPromptSubmit
  //    payload field is named exactly what it holds. Peek at ../solution/ or
  //    docs/the-event-model.md if unsure.)
  const prompt = payload.____ || "(no prompt text in payload)";
  const timestamp = new Date().toISOString();

  // 3. Append one line. appendFileSync creates the file if it doesn't exist.
  //    TODO (2 of 2): build the line. It must end in a newline ("\n") so each
  //    prompt is its own line. A good format is:
  //        `${timestamp}  prompt: ${prompt}\n`
  //    Replace the empty string below with that template literal.
  appendFileSync(LOG_FILE, ``);

  // 4. Anything printed to stdout becomes extra context for the model. This
  //    line proves the round-trip end to end.
  console.log("hello-hook: logged your prompt");
}

try {
  main();
} catch {
  // Fail silent: never let a hook error block the user's turn. (Lesson 1.3.)
}
process.exit(0);
