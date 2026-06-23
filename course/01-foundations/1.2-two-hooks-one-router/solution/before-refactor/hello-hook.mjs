#!/usr/bin/env node
/**
 * hello-hook.mjs — your FIRST standalone hook, from lesson 1.1 (the "before").
 *
 * Kept here unchanged so you can put it next to format-lint.mjs and SEE the
 * duplication: identical stdin read, identical JSON parse, identical
 * appendFileSync, identical try/catch + process.exit(0). Two files, one shape,
 * copied. The router in ../unified-hook.mjs collapses both into one.
 */

import { appendFileSync, readFileSync } from "node:fs";
import { join } from "node:path";
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

  const prompt = payload.prompt || "(no prompt text in payload)";
  const timestamp = new Date().toISOString();
  appendFileSync(LOG_FILE, `${timestamp}  prompt: ${prompt}\n`);

  console.log("hello-hook: logged your prompt");
}

try {
  main();
} catch {
  /* fail silent */
}
process.exit(0);
