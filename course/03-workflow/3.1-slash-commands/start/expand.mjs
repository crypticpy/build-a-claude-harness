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
// the expansion against a known-good fixture. Fill the two function bodies below.
//
// Usage:
//   node expand.mjs scope.md "add retry logic to the client"

import { readFileSync } from "node:fs";

/**
 * Strip a leading `---\n...\n---\n` YAML frontmatter block, if present.
 * If `text` does not start with `---`, return it unchanged.
 * Otherwise return everything AFTER the closing `---` fence (and its newline).
 *
 * @param {string} text
 * @returns {string}
 */
export function stripFrontmatter(text) {
  if (!text.startsWith("---")) return text;
  const end = text.indexOf("\n---", 3);
  if (end === -1) return text;
  const after = text.indexOf("\n", end + 1);
  // TODO (blank 1): return the body that follows the closing fence.
  //   If `after` is -1 (nothing after the fence), return "".
  //   Otherwise return text.slice(after + 1).
  /* your one line here */
}

/**
 * Expand a command file: drop the frontmatter, then replace EVERY occurrence
 * of the literal token `$ARGUMENTS` with `args`.
 *
 * @param {string} commandText  raw file contents
 * @param {string} args         what the user typed after the command name
 * @returns {string}
 */
export function expandCommand(commandText, args) {
  const body = stripFrontmatter(commandText).trimStart();
  // TODO (blank 2): replace ALL occurrences of "$ARGUMENTS" with `args`.
  //   Hint: body.split("$ARGUMENTS").join(args) replaces every one.
  /* your one line here */
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
