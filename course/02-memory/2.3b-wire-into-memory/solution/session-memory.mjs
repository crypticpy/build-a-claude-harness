// session-memory.mjs — the Memento loop from 2.2, now with a REAL summary.
//
// In 2.2 the note was hardcoded. Here the write side calls the model (via the
// callLlm() plumbing from 2.3a) to summarize what actually happened this window.
// The read side is unchanged from 2.2 — it just renders whatever the write side
// stored.
//
// THE COST DECISION (this is the lesson): this call runs on EVERY compaction, so
// it must be cheap. We use the `summarize` role — small token budget, low effort.
// "Spend a little, often." See ../../../docs/where-to-spend-tokens.md.
//
// Anchored to reference/hooks/unified/modules/precompact-llm.mjs (write) and
// session-memory.mjs (read), simplified: one sink (memory only — the lessons.jsonl
// diagnosis sink arrives in 2.4), no poison detection, no tool-count gate.

import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { getApiKey } from "./api-key.mjs";
import { callLlm } from "./llm-call.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const MEMORIES_DIR = join(HERE, "memories");

// The `summarize` role: cheap budget, runs on every compaction. This is the
// token-economy lever — same model as everything else, smaller budget.
const SUMMARIZE_ROLE = { maxTokens: 8000 };

// ── WRITE SIDE: runs on `precompact`. Summarize the window into a memory note. ─
/** Write this session's memory note to memories/<session>.json. */
export async function writeMemory(event, apiKey = getApiKey()) {
  try {
    const { session_id, transcript_path } = event;
    if (!session_id) return;

    mkdirSync(MEMORIES_DIR, { recursive: true });
    const memoryPath = join(MEMORIES_DIR, `${session_id}.json`);

    let prior = {};
    if (existsSync(memoryPath)) {
      try {
        prior = JSON.parse(readFileSync(memoryPath, "utf-8"));
      } catch {
        prior = {};
      }
    }

    // Read the transcript Claude Code points us at. Keyless/no-transcript runs
    // still work — they just fall back to carrying prior fields forward.
    let transcript = "";
    if (transcript_path && existsSync(transcript_path)) {
      try {
        transcript = readFileSync(transcript_path, "utf-8").slice(0, 100_000);
      } catch {
        transcript = "";
      }
    }

    // Ask the model for a small JSON memory. Cheap role, JSON format.
    let summary = null;
    if (apiKey && transcript) {
      const prompt = buildSummarizePrompt(transcript, prior);
      summary = await callLlm(apiKey, SUMMARIZE_ROLE, prompt, { format: "json" });
    }

    const memory = {
      sessionId: session_id,
      startedAt: prior.startedAt || new Date().toISOString(),
      lastCompactionAt: new Date().toISOString(),
      compactionCount: (prior.compactionCount || 0) + 1,
      // Use the LLM fields when we got them; otherwise carry prior forward (or a
      // neutral placeholder on the very first keyless compaction).
      projectContext: summary?.projectContext || prior.projectContext || "(no summary — set LLM_API_KEY)",
      overallDirection: summary?.overallDirection || prior.overallDirection || "",
      milestones: [
        ...(Array.isArray(prior.milestones) ? prior.milestones : []),
        ...(Array.isArray(summary?.newMilestones) ? summary.newMilestones : []),
      ],
    };

    writeFileSync(memoryPath, JSON.stringify(memory, null, 2));
  } catch (err) {
    if (process.env.DEBUG) console.error("[session-memory write]", err);
  }
}

/** Build the summarize prompt: ask for a small JSON memory of THIS window. */
function buildSummarizePrompt(transcript, prior) {
  const priorBlock = prior.projectContext
    ? `Prior memory:\n${JSON.stringify(
        { projectContext: prior.projectContext, overallDirection: prior.overallDirection },
        null,
        2,
      )}\n`
    : "This is the first compaction of this session.\n";

  return `You are summarizing a Claude Code session window for the next context window.
${priorBlock}
TRANSCRIPT (condensed):
${transcript}

Respond ONLY with valid JSON in this exact shape:
{
  "projectContext": "one line: what codebase/project this is",
  "overallDirection": "1-2 sentences: the current high-level goal",
  "newMilestones": ["1-3 terse past-tense bullets of MAJOR events in THIS window, or [] if nothing significant"]
}`;
}

// ── READ SIDE: unchanged from 2.2. Render the stored note. ───────────────────
/** Read this session's memory and render it as a <session-memory> block, or null. */
export function injectMemory(event) {
  try {
    const { session_id } = event;
    if (!session_id) return null;

    const memoryPath = join(MEMORIES_DIR, `${session_id}.json`);
    if (!existsSync(memoryPath)) return null;

    const memory = JSON.parse(readFileSync(memoryPath, "utf-8"));

    let output = "<session-memory>\n";
    output += `Compaction #${memory.compactionCount}\n\n`;
    if (memory.projectContext) output += `Project: ${memory.projectContext}\n`;
    if (memory.overallDirection) output += `Direction: ${memory.overallDirection}\n`;
    if (Array.isArray(memory.milestones) && memory.milestones.length > 0) {
      output += "\nProgression (punch list of major events):\n";
      for (const m of memory.milestones) output += `  • ${m}\n`;
    }
    output += "</session-memory>";
    return output;
  } catch (err) {
    if (process.env.DEBUG) console.error("[session-memory read]", err);
    return null;
  }
}

// --- Run as a hook: dispatch on the event name in argv[2]. ---
//   echo '{"session_id":"demo","transcript_path":"./t.jsonl"}' | node session-memory.mjs precompact
//   echo '{"session_id":"demo"}' | node session-memory.mjs prompt
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
    await writeMemory(event);
  } else if (eventType === "prompt") {
    const block = injectMemory(event);
    if (block) console.log(block);
  }
  process.exit(0);
}
