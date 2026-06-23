// rolling-log.mjs — append every tool operation to a per-session JSONL log.
//
// This is "free memory": a durable record of what tools ran, written with NO
// LLM call. Just file I/O. The reference harness's version
// (reference/hooks/unified/modules/rolling-log.mjs) does more — it also tracks
// file edits, prunes old entries, and can enrich edits with an LLM. We strip
// all of that. The one idea that matters here is the write discipline:
//
//   APPEND-ONLY. NEVER read-modify-write.
//
// Why it matters: Claude Code can run several tools at once, and each one fires
// this hook as its OWN process. If two processes both did
// "read the file → add my line → write the whole file back", the second write
// would clobber the first one's line. appendFileSync side-steps that entirely:
// each process only ever tacks its own line onto the end. No process ever holds
// the whole file, so no process can overwrite another's work.

import { appendFileSync, mkdirSync, readFileSync } from "node:fs";
import { dirname, join, extname } from "node:path";
import { fileURLToPath } from "node:url";

// Storage lives beside THIS script — never an absolute home-directory path, so the
// lesson is portable. (The real harness derives its dir the same way.)
const HERE = dirname(fileURLToPath(import.meta.url));
const LOG_DIR = join(HERE, "logs");

/** Append one tool operation to logs/<session>.jsonl. Best-effort, never throws. */
export function logOperation(event) {
  try {
    const { session_id, tool_name, tool_input, tool_output } = event;
    if (!session_id) return; // nothing to key the log file on

    mkdirSync(LOG_DIR, { recursive: true });
    const sessionLogPath = join(LOG_DIR, `${session_id}.jsonl`);

    const logEntry = {
      timestamp: new Date().toISOString(),
      tool_name,
      output_summary: summarizeOutput(tool_output),
      metadata: extractMetadata(tool_name, tool_input),
    };

    // The whole lesson, in one line: append a single line, never rewrite the file.
    appendFileSync(sessionLogPath, JSON.stringify(logEntry) + "\n");
  } catch (err) {
    // Fail silent: a logging hiccup must never break the user's turn.
    if (process.env.DEBUG) console.error("[rolling-log]", err);
  }
}

/** Truncate large tool outputs so the log stays small. */
function summarizeOutput(output) {
  if (!output) return null;
  const str = typeof output === "string" ? output : JSON.stringify(output);
  return str.length > 500 ? str.slice(0, 500) + "... [truncated]" : str;
}

/** Pull the useful bits out of a tool call for the log metadata. */
function extractMetadata(toolName, toolInput) {
  const meta = { tool: toolName };
  if (toolInput?.file_path) {
    meta.file = toolInput.file_path;
    meta.ext = extname(toolInput.file_path);
  }
  if (toolInput?.command) meta.command = toolInput.command.slice(0, 200);
  return meta;
}

// --- Run as a hook: read the event JSON from stdin, log it, exit 0. ---
// Claude Code wires PostToolUse to call this with the event on stdin. You can
// simulate that yourself:  echo '{"session_id":"demo",...}' | node rolling-log.mjs
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
  logOperation(event);
  process.exit(0);
}
