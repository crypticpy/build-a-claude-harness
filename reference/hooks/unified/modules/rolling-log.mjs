/**
 * Rolling log — the durable record of what tools ran.
 *
 * Every tool operation is appended to a per-session JSONL log, and every
 * file edit is additionally tracked in file-edits.json (counts + timestamps,
 * keyed by file then session). That edit database is what powers the
 * edit-history warnings the prompt hook injects.
 *
 * Two cost controls:
 *   - Optional background enrichment: if config.rolling_log.backgroundEnrichment
 *     is on AND a key is set, summarize each edit with the cheap `summarize`
 *     role into an append-only sidecar (so we never race the synchronous DB
 *     write). Off by default — the harness works fully without a key.
 *   - Pruning runs at most once per hour, gated by a marker file's mtime, so we
 *     don't pay I/O on every single edit.
 *
 * Everything here is best-effort: a write that fails is swallowed.
 */

import {
  readFileSync,
  writeFileSync,
  existsSync,
  mkdirSync,
  appendFileSync,
  readdirSync,
  unlinkSync,
  statSync,
} from "node:fs";
import { dirname, join, extname } from "node:path";
import { fileURLToPath } from "node:url";
import { callLlm } from "./llm-call.mjs";

// Storage derives from this file's location (modules/ -> hooks/unified/).
const HOOK_ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
const LOG_DIR = join(HOOK_ROOT, "logs");
const FILE_EDITS_DB = join(LOG_DIR, "file-edits.json");
// Append-only sidecar for LLM edit summaries — avoids racing trackFileEdit,
// which mutates FILE_EDITS_DB synchronously on every edit.
const EDIT_SUMMARIES_LOG = join(LOG_DIR, "edit-summaries.jsonl");

try {
  if (!existsSync(LOG_DIR)) mkdirSync(LOG_DIR, { recursive: true });
} catch {
  /* fail silent */
}

/** Append one tool operation to the rolling log. */
export async function logOperation(event, config, apiKey) {
  try {
    const { session_id, tool_name, tool_input, tool_output } = event;
    if (!session_id) return;

    const sessionLogPath = join(LOG_DIR, `${session_id}.jsonl`);

    const logEntry = {
      timestamp: new Date().toISOString(),
      tool_name,
      tool_input,
      output_summary: summarizeOutput(tool_output),
      metadata: extractMetadata(tool_name, tool_input),
    };

    appendFileSync(sessionLogPath, JSON.stringify(logEntry) + "\n");

    if (tool_name === "Edit" || tool_name === "Write") {
      await trackFileEdit(event, config, apiKey);
    }

    // Prune at most once per hour, gated by a marker file's mtime.
    const PRUNE_INTERVAL_MS = 60 * 60 * 1000;
    const pruneMarker = join(LOG_DIR, ".last-prune");
    let shouldPrune = true;
    try {
      if (existsSync(pruneMarker)) {
        const lastPrune = statSync(pruneMarker).mtimeMs;
        shouldPrune = Date.now() - lastPrune > PRUNE_INTERVAL_MS;
      }
    } catch {
      /* if we can't stat the marker, just prune */
    }
    if (shouldPrune) {
      pruneOldEntries(config);
      try {
        writeFileSync(pruneMarker, new Date().toISOString());
      } catch {
        /* marker write is non-essential */
      }
    }
  } catch (err) {
    if (process.env.DEBUG) console.error("[rolling-log]", err);
  }
}

/** Track a file edit in file-edits.json (counts + per-session timestamps). */
async function trackFileEdit(event, config, apiKey) {
  const { tool_input, session_id } = event;
  const filePath = tool_input?.file_path;
  if (!filePath) return;

  let db = { files: {} };
  if (existsSync(FILE_EDITS_DB)) {
    try {
      db = JSON.parse(readFileSync(FILE_EDITS_DB, "utf-8"));
    } catch {
      db = { files: {} };
    }
  }

  if (!db.files[filePath]) {
    db.files[filePath] = {
      editCount: 0,
      sessions: {},
      firstEdit: new Date().toISOString(),
    };
  }

  db.files[filePath].editCount++;
  db.files[filePath].lastEdit = new Date().toISOString();

  if (!db.files[filePath].sessions[session_id]) {
    db.files[filePath].sessions[session_id] = { edits: [], count: 0 };
  }

  const edit = { timestamp: new Date().toISOString(), summary: null };
  db.files[filePath].sessions[session_id].edits.push(edit);
  db.files[filePath].sessions[session_id].count++;

  writeFileSync(FILE_EDITS_DB, JSON.stringify(db, null, 2));

  // Optional background enrichment — only when explicitly enabled and a key
  // is present. Pass the timestamp (not the object) so the summary can be
  // matched back after the DB is re-read.
  if (config.rolling_log?.backgroundEnrichment && apiKey) {
    enrichEditSummary(filePath, edit.timestamp, tool_input, apiKey, config).catch(() => {});
  }
}

/**
 * Background enrichment: summarize an edit with the cheap `summarize` role and
 * append it to a sidecar log. Summaries are merged back in on read.
 */
async function enrichEditSummary(filePath, editTimestamp, toolInput, apiKey, config) {
  try {
    const roleConfig = config.llm?.summarize;
    if (!roleConfig) return;

    const prompt = `Summarize this code edit in 1 sentence (max 80 chars):

File: ${filePath}
Changes: ${JSON.stringify(toolInput.diffs || toolInput, null, 2).slice(0, 1000)}

Summary:`;

    const summary = await callLlm(apiKey, roleConfig, prompt, { timeoutMs: 15_000, format: "text" });
    if (!summary) return;

    const record =
      JSON.stringify({
        filePath,
        editTimestamp,
        summary,
        generatedAt: new Date().toISOString(),
      }) + "\n";
    // Sidecar write: a second, append-only file living beside the main log.
    // Slow background LLM enrichment lands here instead of mutating the
    // file-edits DB, so it can never race the synchronous edit-counter write
    // in trackFileEdit. Summaries are merged back by timestamp on read.
    appendFileSync(EDIT_SUMMARIES_LOG, record);
  } catch {
    /* enrichment is best-effort */
  }
}

/** Load {filePath::editTimestamp -> summary} from the sidecar; later wins. */
function loadSummariesMap() {
  const map = new Map();
  if (!existsSync(EDIT_SUMMARIES_LOG)) return map;
  try {
    const content = readFileSync(EDIT_SUMMARIES_LOG, "utf-8");
    for (const line of content.split("\n")) {
      if (!line.trim()) continue;
      try {
        const r = JSON.parse(line);
        if (r.filePath && r.editTimestamp && r.summary) {
          map.set(`${r.filePath}::${r.editTimestamp}`, r.summary);
        }
      } catch {
        /* skip malformed line */
      }
    }
  } catch {
    /* skip unreadable sidecar */
  }
  return map;
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
  } else if (toolInput?.paths) {
    meta.files = toolInput.paths;
  }
  if (toolInput?.query) meta.query = toolInput.query;
  if (toolInput?.command) meta.command = toolInput.command.slice(0, 200);
  return meta;
}

/** Read a file's edit history for this session (used by edit-history). */
export function getFileEditHistory(filePath, sessionId) {
  if (!existsSync(FILE_EDITS_DB)) return null;
  try {
    const db = JSON.parse(readFileSync(FILE_EDITS_DB, "utf-8"));
    const fileData = db.files[filePath];
    if (!fileData) return null;

    const sessionEdits = fileData.sessions[sessionId];
    const rawEdits = sessionEdits?.edits || [];

    const summaries = loadSummariesMap();
    const edits = rawEdits.map((e) => {
      if (e.summary) return e;
      const found = summaries.get(`${filePath}::${e.timestamp}`);
      return found ? { ...e, summary: found } : e;
    });

    return {
      totalEdits: fileData.editCount,
      sessionEdits: sessionEdits?.count || 0,
      edits,
      firstEdit: fileData.firstEdit,
      lastEdit: fileData.lastEdit,
    };
  } catch {
    return null;
  }
}

/**
 * Enforce rolling_log.maxAgeDays / maxEntries: drop stale file entries, prune
 * old edits and sidecar lines, and delete old session log files. Never throws.
 */
function pruneOldEntries(config) {
  try {
    const maxAgeDays = config.rolling_log?.maxAgeDays ?? 30;
    const maxEntries = config.rolling_log?.maxEntries ?? 10000;
    const cutoff = Date.now() - maxAgeDays * 24 * 60 * 60 * 1000;

    // --- Prune the file-edits DB ---
    if (existsSync(FILE_EDITS_DB)) {
      let db;
      try {
        db = JSON.parse(readFileSync(FILE_EDITS_DB, "utf-8"));
      } catch {
        db = null;
      }

      if (db?.files) {
        let changed = false;

        for (const [filePath, fileData] of Object.entries(db.files)) {
          if (fileData.lastEdit && new Date(fileData.lastEdit).getTime() < cutoff) {
            delete db.files[filePath];
            changed = true;
            continue;
          }

          if (fileData.sessions) {
            for (const [sessionId, sessionData] of Object.entries(fileData.sessions)) {
              if (sessionData.edits) {
                sessionData.edits = sessionData.edits.filter(
                  (e) => !e.timestamp || new Date(e.timestamp).getTime() >= cutoff,
                );
                sessionData.count = sessionData.edits.length;
              }
              if (!sessionData.edits || sessionData.edits.length === 0) {
                delete fileData.sessions[sessionId];
                changed = true;
              }
            }
            if (Object.keys(fileData.sessions).length === 0) {
              delete db.files[filePath];
              changed = true;
              continue;
            }
          }

          const totalEdits = Object.values(fileData.sessions || {}).reduce(
            (sum, s) => sum + (s.count || 0),
            0,
          );
          if (totalEdits !== fileData.editCount) {
            fileData.editCount = totalEdits;
            changed = true;
          }
        }

        const fileKeys = Object.keys(db.files);
        if (fileKeys.length > maxEntries) {
          const sorted = fileKeys.sort((a, b) => {
            const aTime = new Date(db.files[a].lastEdit || 0).getTime();
            const bTime = new Date(db.files[b].lastEdit || 0).getTime();
            return aTime - bTime;
          });
          const toRemove = sorted.slice(0, fileKeys.length - maxEntries);
          for (const key of toRemove) delete db.files[key];
          changed = true;
        }

        if (changed) writeFileSync(FILE_EDITS_DB, JSON.stringify(db, null, 2));
      }
    }

    // --- Prune the edit-summaries sidecar ---
    try {
      if (existsSync(EDIT_SUMMARIES_LOG)) {
        const lines = readFileSync(EDIT_SUMMARIES_LOG, "utf-8").split("\n");
        const kept = [];
        let dropped = 0;
        for (const line of lines) {
          if (!line.trim()) continue;
          try {
            const r = JSON.parse(line);
            const ts = r.editTimestamp ? new Date(r.editTimestamp).getTime() : 0;
            if (ts >= cutoff) kept.push(line);
            else dropped++;
          } catch {
            dropped++;
          }
        }
        if (dropped > 0) {
          writeFileSync(EDIT_SUMMARIES_LOG, kept.length ? kept.join("\n") + "\n" : "");
        }
      }
    } catch {
      /* skip sidecar prune */
    }

    // --- Delete old session log files ---
    try {
      const logFiles = readdirSync(LOG_DIR).filter((f) => f.endsWith(".jsonl"));
      for (const file of logFiles) {
        const fullPath = join(LOG_DIR, file);
        try {
          if (statSync(fullPath).mtimeMs < cutoff) unlinkSync(fullPath);
        } catch {
          /* skip files we can't stat */
        }
      }
    } catch {
      /* skip if we can't read the log dir */
    }
  } catch (err) {
    if (process.env.DEBUG) console.error("[rolling-log] prune", err);
  }
}
