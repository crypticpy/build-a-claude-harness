// context-report.mjs — one warning, once per session.
//
// On UserPromptSubmit, estimate how full the context window is from the last
// assistant message's token usage. When we cross ~90% of the auto-compact
// threshold, emit a SINGLE heads-up so the model can wrap up before a compaction
// interrupts it. Silent otherwise — no per-prompt spam. A per-session marker
// file makes the warning fire exactly once.
//
// Anchored to reference/hooks/unified/modules/context-report.mjs, simplified:
// the transcript path is passed in on the event (the reference locates it under
// ~/.claude/projects from the session id). The marker dir derives from THIS
// file's location — no absolute home paths.

import { readFileSync, existsSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const MARKER_DIR = join(HERE, "memories");

function computeCompactThreshold() {
  const window = parseInt(process.env.CLAUDE_CODE_AUTO_COMPACT_WINDOW || "200000", 10);
  return Math.floor(window * 0.8);
}

function markerPath(sessionId) {
  return join(MARKER_DIR, `.warned-90pct-${sessionId}`);
}

function alreadyWarned(sessionId) {
  return existsSync(markerPath(sessionId));
}

// Record the marker atomically. The 'wx' flag fails if the file already exists,
// so if two hook runs race, exactly one wins and emits the warning.
function recordWarned(sessionId) {
  const p = markerPath(sessionId);
  try {
    mkdirSync(dirname(p), { recursive: true });
    writeFileSync(p, String(Date.now()), { flag: "wx" });
    return true;
  } catch {
    return false;
  }
}

// Sum every token type in the last assistant message: input + both caches +
// output. That total is the current context size.
function contextFromTranscript(transcriptPath) {
  const lines = readFileSync(transcriptPath, "utf-8").split("\n").filter((l) => l.trim());
  let lastAssistant = null;
  for (let i = lines.length - 1; i >= 0; i--) {
    try {
      const entry = JSON.parse(lines[i]);
      if (entry.type === "assistant") {
        lastAssistant = entry;
        break;
      }
    } catch {
      /* skip malformed line */
    }
  }
  const usage = lastAssistant?.message?.usage;
  if (!usage) return null;
  return (
    (usage.input_tokens || 0) +
    (usage.cache_read_input_tokens || 0) +
    (usage.cache_creation_input_tokens || 0) +
    (usage.output_tokens || 0)
  );
}

/**
 * Returns a warning string the FIRST time context crosses ~90% of the
 * auto-compact threshold this session, and null every other time (already
 * warned, below threshold, no usable transcript, or any error).
 */
export async function reportContext(event) {
  try {
    const { session_id, transcript_path } = event;
    if (!session_id) return null;
    if (alreadyWarned(session_id)) return null;
    if (!transcript_path || !existsSync(transcript_path)) return null;

    const currentContext = contextFromTranscript(transcript_path);
    if (currentContext == null) return null;

    const compactAt = computeCompactThreshold();
    const warnAt = Math.floor(compactAt * 0.9);
    if (currentContext < warnAt) return null;

    // At/past 90%. Record the marker FIRST; if we lose the race, stay silent.
    if (!recordWarned(session_id)) return null;

    const currentK = Math.floor(currentContext / 1000);
    const compactK = Math.floor(compactAt / 1000);
    const percent = Math.min(100, Math.floor((currentContext * 100) / compactAt));
    return `[Context at ${percent}% (${currentK}K/${compactK}K) — consider wrapping up the current task; auto-compact will fire near ${compactK}K.]`;
  } catch {
    return null;
  }
}

// Standalone: `echo '{"session_id":"x","transcript_path":"./t.jsonl"}' | node context-report.mjs`
if (import.meta.url === `file://${process.argv[1]}`) {
  const chunks = [];
  process.stdin.on("data", (c) => chunks.push(c));
  process.stdin.on("end", async () => {
    let event = {};
    try {
      event = JSON.parse(Buffer.concat(chunks).toString() || "{}");
    } catch {
      /* empty event */
    }
    const out = await reportContext(event);
    if (out) console.log(out);
  });
}
