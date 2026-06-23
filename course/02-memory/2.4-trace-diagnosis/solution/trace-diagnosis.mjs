// trace-diagnosis.mjs — two read-backs that reuse memory's events.
//
// 1. WRITE side (`precompact`): the SAME compaction moment that writes memory
//    also extracts a LESSON from the session and appends it to lessons.jsonl.
//    One transcript parse, two outputs (memory + diagnosis) — that's the token
//    economy: you already paid to read the transcript, so squeeze two uses out
//    of it. Here we keep the diagnosis DETERMINISTIC (counts from the transcript:
//    tool calls, errors), so it needs no key and the checkpoint is repeatable.
//
// 2. READ side (`prompt`): when your prompt NAMES a file that has edit history,
//    inject a short "you've touched this file N times, here's what changed"
//    note. Repeated churn on one file is a signal worth surfacing.
//
// Anchored to reference/hooks/unified/modules/precompact-llm.mjs (writeLesson)
// and edit-history.mjs (checkEditHistory), simplified: signal-only lesson, no LLM.

import { readFileSync, appendFileSync, mkdirSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const LESSONS_PATH = join(HERE, "context-layer", "lessons.jsonl");
// The edit database the rolling log (lesson 2.1's reference cousin) writes.
const FILE_EDITS_DB = join(HERE, "logs", "file-edits.json");

// ── WRITE SIDE: runs on `precompact`. Append a lesson to lessons.jsonl. ───────
/** Parse the transcript for cheap signals and append one diagnosis entry. */
export function writeLesson(event) {
  try {
    const { session_id, transcript_path } = event;
    if (!session_id || !transcript_path || !existsSync(transcript_path)) return;

    const transcript = readFileSync(transcript_path, "utf-8");
    const signals = computeSignals(transcript);

    // A simple deterministic lesson from the signals. The reference asks an LLM
    // for richer "patterns/lessons/improvements"; the cheap signals below are the
    // free floor it builds on.
    const lessons =
      signals.toolErrors > 0
        ? [`${signals.toolErrors} tool error(s) this window — check for a flaky step.`]
        : ["Session window completed without tool errors."];

    const entry = {
      timestamp: new Date().toISOString(),
      type: "trace-diagnosis",
      session_id,
      lessons,
      stats: signals,
    };

    mkdirSync(dirname(LESSONS_PATH), { recursive: true });
    appendFileSync(LESSONS_PATH, JSON.stringify(entry) + "\n"); // append-only, like the rolling log
  } catch (err) {
    if (process.env.DEBUG) console.error("[trace-diagnosis write]", err);
  }
}

/** Count cheap signals from the JSONL transcript: turns, tool calls, errors. */
function computeSignals(transcript) {
  const signals = { totalTurns: 0, totalToolCalls: 0, toolErrors: 0 };
  for (const line of transcript.split("\n").filter(Boolean)) {
    let entry;
    try {
      entry = JSON.parse(line);
    } catch {
      continue;
    }
    if (entry.type === "user" || entry.type === "assistant") signals.totalTurns++;
    const content = entry.message?.content;
    if (Array.isArray(content)) {
      for (const block of content) {
        if (block.type === "tool_use") signals.totalToolCalls++;
        if (block.type === "tool_result" && block.is_error) signals.toolErrors++;
      }
    }
  }
  return signals;
}

// ── READ SIDE: runs on `prompt`. Surface a named file's recent edits. ────────
/** If the prompt names a file with edit history, return a warning string, or null. */
export function checkEditHistory(event) {
  try {
    const { prompt } = event;
    if (!prompt || !existsSync(FILE_EDITS_DB)) return null;

    const db = JSON.parse(readFileSync(FILE_EDITS_DB, "utf-8"));
    const threshold = 2; // surface once a file's been edited at least twice
    const warnings = [];

    for (const filePath of extractFilePaths(prompt)) {
      const fileData = db.files?.[filePath];
      if (!fileData) continue;
      if ((fileData.editCount || 0) < threshold) continue;

      const recent = (fileData.edits || [])
        .map((e) => e.summary)
        .filter(Boolean)
        .slice(-5);

      let warning = `FILE HISTORY: \`${filePath}\` has been edited ${fileData.editCount}x`;
      if (recent.length > 0) {
        warning += `\nRecent changes:\n${recent.map((s, i) => `  ${i + 1}. ${s}`).join("\n")}`;
      }
      warnings.push(warning);
    }

    return warnings.length > 0 ? warnings.join("\n\n") : null;
  } catch (err) {
    if (process.env.DEBUG) console.error("[trace-diagnosis read]", err);
    return null;
  }
}

/** Pull plausible file paths out of a prompt (backticked or path-like tokens). */
function extractFilePaths(prompt) {
  const paths = new Set();
  const backticked = prompt.match(/`([^`]+\.[a-zA-Z]{1,5})`/g) || [];
  for (const m of backticked) paths.add(m.replace(/`/g, ""));
  const pathish = prompt.match(/[a-zA-Z0-9_\-./]+\.[a-zA-Z]{1,5}/g) || [];
  for (const p of pathish) paths.add(p);
  return Array.from(paths);
}

// --- Run as a hook: dispatch on the event name in argv[2]. ---
//   echo '{"session_id":"d","transcript_path":"./t.jsonl"}' | node trace-diagnosis.mjs precompact
//   echo '{"prompt":"look at src/app.js"}' | node trace-diagnosis.mjs prompt
if (import.meta.url === `file://${process.argv[1]}`) {
  const eventType = process.argv[2];
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

  if (eventType === "precompact") {
    writeLesson(event);
  } else if (eventType === "prompt") {
    const warning = checkEditHistory(event);
    if (warning) console.log(warning);
  }
  process.exit(0);
}
