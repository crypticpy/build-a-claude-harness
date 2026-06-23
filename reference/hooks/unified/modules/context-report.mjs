/**
 * Context report — one warning, once per session.
 *
 * On UserPromptSubmit, estimate how full the context window is from the last
 * assistant message's token usage. When we cross ~90% of the auto-compact
 * trigger, emit a single heads-up so the model can wrap up the current task
 * before a compaction interrupts it. Silent otherwise — no per-prompt spam.
 *
 * The threshold is derived at runtime: Claude Code's auto-compact fires near
 * 80% of the configured window, and we warn at 90% of that. A per-session
 * marker file makes the warning fire exactly once.
 */

import { readFileSync, existsSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

// Module-owned storage (the once-per-session marker) derives from this file.
const HOOK_ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
const MARKER_DIR = join(HOOK_ROOT, "memories");

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

function recordWarned(sessionId) {
  const p = markerPath(sessionId);
  try {
    mkdirSync(dirname(p), { recursive: true });
    // 'wx' fails if the file exists — atomic against concurrent hook runs.
    writeFileSync(p, String(Date.now()), { flag: "wx" });
    return true;
  } catch {
    return false;
  }
}

/**
 * Locate the current session's transcript. Claude Code stores transcripts under
 * its own projects dir, keyed by a slugified project path. We read HOME only to
 * find that dir — no project-specific path is hardcoded.
 */
function transcriptPathFor(sessionId) {
  const home = process.env.HOME || "";
  if (!home) return null;
  const projectDir = process.env.CLAUDE_PROJECT_DIR || process.cwd();
  const projectFolder = projectDir.replace(/^\//, "").replace(/\//g, "-").replace(/^/, "-");
  return join(home, ".claude", "projects", projectFolder, `${sessionId}.jsonl`);
}

export async function reportContext(event, _config) {
  try {
    const { session_id } = event;
    if (!session_id) return null;
    if (alreadyWarned(session_id)) return null;

    const transcriptPath = transcriptPathFor(session_id);
    if (!transcriptPath || !existsSync(transcriptPath)) return null;

    // Pull token usage from the last assistant message in the transcript.
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

    if (!lastAssistant?.message?.usage) return null;

    const usage = lastAssistant.message.usage;
    const currentContext =
      (usage.input_tokens || 0) +
      (usage.cache_read_input_tokens || 0) +
      (usage.cache_creation_input_tokens || 0) +
      (usage.output_tokens || 0);

    const compactAt = computeCompactThreshold();
    const warnAt = Math.floor(compactAt * 0.9);
    if (currentContext < warnAt) return null;

    // At/past 90%. Record the marker first; if that loses the race, another
    // hook run already warned — stay silent.
    if (!recordWarned(session_id)) return null;

    const currentK = Math.floor(currentContext / 1000);
    const compactK = Math.floor(compactAt / 1000);
    const percent = Math.min(100, Math.floor((currentContext * 100) / compactAt));

    return `[Context at ${percent}% (${currentK}K/${compactK}K) — consider wrapping up the current task; auto-compact will fire near ${compactK}K.]`;
  } catch {
    return null;
  }
}
