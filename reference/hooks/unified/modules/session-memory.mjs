/**
 * Session memory — the READ side.
 *
 * On UserPromptSubmit, read the memory the previous PreCompact wrote for this
 * session and render it as a <session-memory> block. That block is what gives
 * the next context window continuity: after a compaction wipes the running
 * transcript, the model still sees "here's the project, the direction, and the
 * punch list of what happened so far."
 *
 * The WRITE side lives in precompact-llm.mjs. This module only reads.
 *
 * It also exports two small guards — isPoisonedMemory / hasRealContent — that
 * both sides share. "Poisoned" memory is the empty-stub shape an early failed
 * LLM call can leave behind; detecting it in one place keeps a bad write from
 * ever being shown or carried forward.
 */

import { readFileSync, existsSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

// Storage is derived from THIS file's location, never an absolute home path.
// modules/ -> .. -> hooks/unified/ is the hook root; memories live beside it.
const HOOK_ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
const MEMORIES_DIR = join(HOOK_ROOT, "memories");

try {
  if (!existsSync(MEMORIES_DIR)) mkdirSync(MEMORIES_DIR, { recursive: true });
} catch {
  /* fail silent — a missing dir just means no memory to read */
}

/**
 * The degenerate shape a failed/empty LLM call can write. The rule is
 * STRUCTURAL, not literal: the precompact prompt explicitly tells the model NOT
 * to emit placeholders like "Unknown"/"In progress" (it says to carry prior
 * memory forward instead), so keying on those magic strings caught nothing real.
 * Instead we treat a memory as poisoned when it carries no real signal —
 * projectContext is missing/empty/whitespace AND there are no milestones and no
 * keyPoints. (We check both `milestones` from stored memory and `newMilestones`
 * from the LLM's raw `result.memory`, since this guard runs on both shapes.)
 * The old literal placeholders are kept only as a secondary belt-and-suspenders cue.
 */
export function isPoisonedMemory(data) {
  if (!data) return false;

  const context = typeof data.projectContext === "string" ? data.projectContext.trim() : "";
  const hasContext = context.length > 0;
  const hasMilestones =
    (data.milestones?.length || 0) > 0 || (data.newMilestones?.length || 0) > 0;
  const hasKeyPoints = (data.keyPoints?.length || 0) > 0;

  // No real signal anywhere → poisoned.
  if (!hasContext && !hasMilestones && !hasKeyPoints) return true;

  // Secondary cue: the legacy placeholder stub with nothing else attached.
  return (
    data.projectContext === "Unknown" &&
    data.overallDirection === "In progress" &&
    !hasKeyPoints &&
    !hasMilestones
  );
}

/** True when memory has real content worth preserving (empty-string context is NOT real). */
export function hasRealContent(data) {
  const context = typeof data?.projectContext === "string" ? data.projectContext.trim() : "";
  return context.length > 0 && !isPoisonedMemory(data);
}

/**
 * Read this session's memory and render it as a <session-memory> block, or
 * null if there's nothing real to show.
 */
export async function injectMemory(event) {
  try {
    const { session_id } = event;
    if (!session_id) return null;

    const memoryPath = join(MEMORIES_DIR, `${session_id}.json`);
    if (!existsSync(memoryPath)) return null;

    const memory = JSON.parse(readFileSync(memoryPath, "utf-8"));

    if (
      !memory.projectContext &&
      !memory.overallDirection &&
      !memory.keyPoints?.length &&
      !memory.milestones?.length
    ) {
      return null;
    }
    if (isPoisonedMemory(memory)) return null;

    const startedAt = new Date(memory.startedAt);
    const now = new Date();
    const durationMs = now - startedAt;
    const durationHours = Math.floor(durationMs / (1000 * 60 * 60));
    const durationMins = Math.floor((durationMs % (1000 * 60 * 60)) / (1000 * 60));
    const durationStr = durationHours > 0 ? `${durationHours}h ${durationMins}m` : `${durationMins}m`;

    let output = "<session-memory>\n";
    output += `Compaction #${memory.compactionCount} | Session: ${durationStr}\n\n`;

    if (memory.projectContext) output += `Project: ${memory.projectContext}\n`;
    if (memory.overallDirection) output += `Direction: ${memory.overallDirection}\n`;
    if (memory.longTermNarrative) output += `\nNarrative: ${memory.longTermNarrative}\n`;

    if (Array.isArray(memory.milestones) && memory.milestones.length > 0) {
      output += "\nProgression (punch list of major events):\n";
      memory.milestones.forEach((m) => {
        const tag = m && typeof m === "object" && m.c ? `[#${m.c}] ` : "";
        const text = typeof m === "string" ? m : m?.t || "";
        if (text) output += `  • ${tag}${text}\n`;
      });
    } else if (memory.keyPoints?.length > 0) {
      // Legacy memories written before the punch-list change.
      output += "\nHistory:\n";
      memory.keyPoints.forEach((point, i) => {
        const text =
          typeof point === "string" ? point : point.summary || point.text || JSON.stringify(point);
        output += `  ${i + 1}. ${text}\n`;
      });
    }

    output += "</session-memory>";
    return output;
  } catch (err) {
    if (process.env.DEBUG) process.stderr.write("[session-memory] " + err.message + "\n");
    return null;
  }
}
