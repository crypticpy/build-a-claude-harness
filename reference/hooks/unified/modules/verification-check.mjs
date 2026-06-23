/**
 * Verification check — run on Stop.
 *
 * If the last assistant turn made several file edits, inject a short self-check
 * list before the model wraps up. The idea is a cheap double-confirmation: after
 * a burst of edits, prompt the model to confirm scope, leftovers, and error
 * handling rather than declaring done on the first pass.
 *
 * To stay cheap on huge transcripts we read only the tail of the file and look
 * at the most recent assistant turn. Below the threshold (or on any error) we
 * return null and stay silent.
 */

import { readFileSync, statSync, openSync, readSync, closeSync } from "node:fs";

const EDIT_THRESHOLD = 3;
const TAIL_BYTES = 50 * 1024; // only read the last 50KB of the transcript
const TOOL_NAMES = new Set(["Write", "Edit"]);

/** Read just the tail of a (possibly very large) transcript file. */
function readTranscriptTail(transcriptPath) {
  const fileSize = statSync(transcriptPath).size;
  if (fileSize <= TAIL_BYTES) return readFileSync(transcriptPath, "utf-8");

  const buf = Buffer.alloc(TAIL_BYTES);
  const fd = openSync(transcriptPath, "r");
  try {
    readSync(fd, buf, 0, TAIL_BYTES, fileSize - TAIL_BYTES);
  } finally {
    closeSync(fd);
  }

  const text = buf.toString("utf-8");
  // Drop the first (likely partial) line.
  const firstNewline = text.indexOf("\n");
  return firstNewline >= 0 ? text.slice(firstNewline + 1) : text;
}

/** Collect the last contiguous run of assistant entries from the tail. */
function extractLastAssistantTurn(transcriptText) {
  const lines = transcriptText.split("\n").filter((l) => l.trim());
  const entries = [];
  for (const line of lines) {
    try {
      entries.push(JSON.parse(line));
    } catch {
      /* skip malformed (e.g. partial first line) */
    }
  }
  if (entries.length === 0) return [];

  const assistantEntries = [];
  for (let i = entries.length - 1; i >= 0; i--) {
    const entry = entries[i];
    if (entry.type === "assistant") {
      assistantEntries.unshift(entry);
    } else if (assistantEntries.length > 0) {
      break; // hit a non-assistant entry after collecting some — turn is complete
    }
  }
  return assistantEntries;
}

/** Count Write/Edit tool_use blocks across the assistant entries. */
function countFileEdits(assistantEntries) {
  let editCount = 0;
  for (const entry of assistantEntries) {
    const content = entry?.message?.content;
    if (!Array.isArray(content)) continue;
    for (const block of content) {
      if (block.type === "tool_use" && TOOL_NAMES.has(block.name)) editCount++;
    }
  }
  return editCount;
}

function buildChecklist(editCount) {
  return `<verification-check>
[SELF-CHECK] Significant code changes detected (${editCount} files modified this turn).

Before proceeding, verify:
- [ ] Implementation matches the requested changes — no scope creep
- [ ] No TODO/FIXME/placeholder items left behind
- [ ] Error handling is complete (no empty catch blocks, no swallowed errors)
- [ ] No hardcoded values that should be configurable
- [ ] Changes are consistent with existing code patterns

If working on a plan: confirm this phase's objectives are met before moving to the next phase.
</verification-check>`;
}

/** Returns a checklist string when edits >= threshold, else null. */
export async function runVerification(event, _config) {
  try {
    const transcriptPath = event?.transcript_path;
    if (!transcriptPath) return null;

    const transcriptText = readTranscriptTail(transcriptPath);
    if (!transcriptText) return null;

    const assistantEntries = extractLastAssistantTurn(transcriptText);
    if (assistantEntries.length === 0) return null;

    const editCount = countFileEdits(assistantEntries);
    return editCount >= EDIT_THRESHOLD ? buildChecklist(editCount) : null;
  } catch {
    return null; // never block Stop
  }
}
