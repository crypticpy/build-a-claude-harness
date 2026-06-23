// session-memory.mjs — the Memento loop from 2.2, now with a REAL summary.
//
// In 2.2 the note was hardcoded. Here the write side calls the model (via the
// callLlm() plumbing from 2.3a) to summarize what actually happened. The read
// side is unchanged from 2.2.
//
// THE COST DECISION (this is the lesson): this call runs on EVERY compaction, so
// it must be cheap. Use the `summarize` role — small budget, runs constantly.
// "Spend a little, often." See ../../../docs/where-to-spend-tokens.md.
//
// ── YOUR JOB ──────────────────────────────────────────────────────────────
// Two blanks, both marked `// TODO`. The client files (api-key.mjs, llm-call.mjs)
// ship complete — don't touch them.

import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { getApiKey } from "./api-key.mjs";
import { callLlm } from "./llm-call.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const MEMORIES_DIR = join(HERE, "memories");

// TODO (blank 1): the `summarize` role budget. This call runs on EVERY
// compaction, so it must be CHEAP. Set a small maxTokens (the reference uses
// 8000). Bigger = more expensive on every single compaction — that's the lever.
const SUMMARIZE_ROLE = { maxTokens: /* TODO: a small number, e.g. 8000 */ 0 };

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

    let transcript = "";
    if (transcript_path && existsSync(transcript_path)) {
      try {
        transcript = readFileSync(transcript_path, "utf-8").slice(0, 100_000);
      } catch {
        transcript = "";
      }
    }

    // TODO (blank 2): call the model for a small JSON memory. Use the cheap role
    // and JSON format. Replace null below.
    // Hint: summary = await callLlm(apiKey, SUMMARIZE_ROLE, prompt, { format: "json" });
    let summary = null;
    if (apiKey && transcript) {
      const prompt = buildSummarizePrompt(transcript, prior);
      /* summary = await ... */
    }

    const memory = {
      sessionId: session_id,
      startedAt: prior.startedAt || new Date().toISOString(),
      lastCompactionAt: new Date().toISOString(),
      compactionCount: (prior.compactionCount || 0) + 1,
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
