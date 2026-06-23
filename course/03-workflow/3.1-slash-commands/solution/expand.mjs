// expand.mjs — what Claude Code does to a slash command before it reaches the model.
//
// A slash command is a Markdown file with YAML frontmatter. When you type
// `/scope add retry logic to the client`, Claude Code:
//   1. strips the frontmatter (it's metadata for the picker, not for the model),
//   2. substitutes the literal `$ARGUMENTS` token with everything you typed
//      after the command name,
//   3. injects the result into your conversation as if you'd pasted it.
//
// This script reproduces steps 1–2 deterministically so the checkpoint can diff
// the expansion against a known-good fixture. The real expansion is internal to
// Claude Code; this is a faithful, testable model of it.
//
// Usage:
//   node expand.mjs scope.md "add retry logic to the client"

import { readFileSync } from "node:fs";

/** Strip a leading `---\n...\n---\n` YAML frontmatter block, if present. */
export function stripFrontmatter(text) {
  if (!text.startsWith("---")) return text;
  const end = text.indexOf("\n---", 3);
  if (end === -1) return text;
  // Skip past the closing fence and its trailing newline.
  const after = text.indexOf("\n", end + 1);
  return after === -1 ? "" : text.slice(after + 1);
}

/** Expand a command file: drop frontmatter, substitute every $ARGUMENTS. */
export function expandCommand(commandText, args) {
  const body = stripFrontmatter(commandText).trimStart();
  // Replace ALL occurrences — a command may reference $ARGUMENTS more than once.
  return body.split("$ARGUMENTS").join(args);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const [, , commandPath, ...argParts] = process.argv;
  if (!commandPath) {
    console.error("usage: node expand.mjs <command.md> <arguments...>");
    process.exit(2);
  }
  const args = argParts.join(" ");
  const text = readFileSync(commandPath, "utf-8");
  process.stdout.write(expandCommand(text, args));
}
