// verification-check.mjs — inject a self-review checklist after a burst of edits.
//
// This is the DISTINCT companion to the quality gate (3.4a). The gate runs a
// TOOL (a type-check). This module runs NO tool and NO model: it just counts how
// many files the last assistant turn edited, and if that's >= 3, it injects a
// short self-check list before the model wraps up. The idea is a cheap double-
// confirmation — after a burst of edits, prompt the model to confirm scope,
// leftovers, and error handling rather than declaring done on the first pass.
//
// Simplified from reference/hooks/unified/modules/verification-check.mjs:
//   - same EDIT_THRESHOLD = 3 and same {Write, Edit} tool names,
//   - same "look at the LAST assistant turn only" logic,
//   - we read the whole (small) transcript fixture instead of tailing 50KB.
//
// Usage:
//   echo '{"transcript_path":"../fixtures/three-edits.jsonl"}' | node verification-check.mjs

import { readFileSync } from "node:fs";

const EDIT_THRESHOLD = 3;
const TOOL_NAMES = new Set(["Write", "Edit"]);

/** Collect the last contiguous run of assistant entries from the transcript. */
export function extractLastAssistantTurn(transcriptText) {
  const entries = [];
  for (const line of transcriptText.split("\n")) {
    if (!line.trim()) continue;
    try {
      entries.push(JSON.parse(line));
    } catch {
      /* skip malformed lines */
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
export function countFileEdits(assistantEntries) {
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
</verification-check>`;
}

/** Returns the checklist string when edits >= threshold this turn, else null. */
export function runVerification(event) {
  try {
    const transcriptPath = event?.transcript_path;
    if (!transcriptPath) return null;

    const transcriptText = readFileSync(transcriptPath, "utf-8");
    const assistantEntries = extractLastAssistantTurn(transcriptText);
    if (assistantEntries.length === 0) return null;

    const editCount = countFileEdits(assistantEntries);
    return editCount >= EDIT_THRESHOLD ? buildChecklist(editCount) : null;
  } catch {
    return null; // never block Stop
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  let raw = "";
  try {
    raw = readFileSync(0, "utf-8");
  } catch {
    raw = "";
  }
  let event = {};
  try {
    event = raw ? JSON.parse(raw) : {};
  } catch {
    event = {};
  }
  const out = runVerification(event);
  if (out) console.log(out);
  process.exit(0);
}
