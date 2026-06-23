// rolling-log.mjs — append every tool operation to a per-session JSONL log.
//
// This is "free memory": a durable record of what tools ran, written with NO
// LLM call. Just file I/O. The one idea that matters here is the WRITE
// DISCIPLINE:
//
//   APPEND-ONLY. NEVER read-modify-write.
//
// Why: Claude Code can run several tools at once, and each fires this hook as
// its OWN process. If two processes both did "read the whole file → add a line
// → write the whole file back", the second write would clobber the first's
// line. Appending one line side-steps that: no process ever holds the whole
// file, so no process can overwrite another's work.
//
// ── YOUR JOB ──────────────────────────────────────────────────────────────
// Two blanks below, both marked `// TODO`. The rest is done. Fill them in, then
// run the Checkpoint in the README.

import { appendFileSync, mkdirSync, readFileSync } from "node:fs";
import { dirname, join, extname } from "node:path";
import { fileURLToPath } from "node:url";

// Storage lives beside THIS script — never an absolute home-directory path.
const HERE = dirname(fileURLToPath(import.meta.url));
const LOG_DIR = join(HERE, "logs");

/** Append one tool operation to logs/<session>.jsonl. Best-effort, never throws. */
export function logOperation(event) {
  try {
    const { session_id, tool_name, tool_input, tool_output } = event;
    if (!session_id) return; // nothing to key the log file on

    mkdirSync(LOG_DIR, { recursive: true });

    // TODO (blank 1): build the path to this session's log file, inside LOG_DIR,
    // named "<session_id>.jsonl". Use join(...). Replace null below.
    const sessionLogPath = null;

    const logEntry = {
      timestamp: new Date().toISOString(),
      tool_name,
      output_summary: summarizeOutput(tool_output),
      metadata: extractMetadata(tool_name, tool_input),
    };

    // TODO (blank 2): APPEND one line to sessionLogPath. This is the heart of the
    // lesson — append, never overwrite. Write the entry as JSON followed by "\n".
    // Hint: appendFileSync(sessionLogPath, JSON.stringify(logEntry) + "\n");
    /* your one line here */
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
// Simulate Claude Code:  echo '{"session_id":"demo",...}' | node rolling-log.mjs
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
