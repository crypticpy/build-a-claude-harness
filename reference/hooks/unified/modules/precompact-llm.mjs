/**
 * PreCompact consolidation — the WRITE side of memory, plus diagnosis.
 *
 * This is the heart of the harness. Right before Claude Code compacts the
 * conversation (discarding the running transcript), this runs ONE LLM call that
 * produces two things at once:
 *
 *   1. NARRATIVE MEMORY  → memories/<session>.json
 *        projectContext, overallDirection, an append-only milestone punch list,
 *        and a short narrative. session-memory.mjs reads this back next turn so
 *        the post-compaction window keeps its bearings.
 *
 *   2. EFFICIENCY DIAGNOSIS → lessons.jsonl
 *        efficiency score + observed failure patterns + lessons + improvements,
 *        joined with cheap pre-computed signals (tool errors, retries, spirals).
 *        self-evolution and deep-retrospective mine these later.
 *
 * One transcript parse, one LLM call, two sinks — that's the token economy. It
 * runs on EVERY compaction, so it uses the cheap `summarize` role.
 *
 * Guard rails:
 *   - MIN_TOOL_CALLS: sessions with fewer than 5 tool calls are too short to
 *     learn from; skip the LLM entirely.
 *   - Poison detection: a stub/empty memory never overwrites real memory; on a
 *     failed or absent LLM call we carry the prior memory forward verbatim.
 */

import { readFileSync, writeFileSync, appendFileSync, existsSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { callLlm } from "./llm-call.mjs";
import { isPoisonedMemory, hasRealContent } from "./session-memory.mjs";

// Storage derives from this file's location (modules/ -> hooks/unified/).
const HOOK_ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
const MEMORIES_DIR = join(HOOK_ROOT, "memories");

const MAX_TRANSCRIPT_CHARS = 500_000;
const MIN_TOOL_CALLS = 5;
const LLM_TIMEOUT_MS = 60_000;
const MAX_MILESTONES = 60; // append-only punch list; oldest entries drop past this

try {
  if (!existsSync(MEMORIES_DIR)) mkdirSync(MEMORIES_DIR, { recursive: true });
} catch {
  /* fail silent */
}

/**
 * Parse the JSONL transcript in one pass: count efficiency signals AND build a
 * condensed message stream for the prompt. If continuing from prior memory,
 * start after the most recent transcript-summary marker so we only analyze the
 * new window.
 */
function parseTranscript(transcript, existingMemory) {
  const lines = transcript.split("\n").filter(Boolean);
  const signals = {
    totalTurns: 0,
    totalToolCalls: 0,
    toolErrors: 0,
    retryPatterns: 0,
    explorationSpirals: 0,
    contextSwitches: 0,
    permissionDenials: 0,
    errorMessages: [],
  };
  const messages = [];

  let lastToolName = null;
  let lastToolArgs = null;
  let consecutiveSameTool = 0;
  let consecutiveBashCount = 0;
  let lastFileContext = null;

  let startFromLine = 0;
  if (existingMemory) {
    for (let i = lines.length - 1; i >= 0; i--) {
      try {
        const entry = JSON.parse(lines[i]);
        if (entry.type === "summary") {
          startFromLine = i + 1;
          break;
        }
      } catch {
        /* skip malformed line */
      }
    }
  }

  for (let i = startFromLine; i < lines.length; i++) {
    let entry;
    try {
      entry = JSON.parse(lines[i]);
    } catch {
      continue;
    }

    if (entry.type === "user" || entry.type === "assistant") signals.totalTurns++;

    // Assistant: text + tool_use blocks
    if (entry.type === "assistant" && Array.isArray(entry.message?.content)) {
      let textBuf = "";
      for (const block of entry.message.content) {
        if (block.type === "text" && block.text) textBuf += block.text + "\n";
        if (block.type === "tool_use") {
          signals.totalToolCalls++;
          const toolName = block.name || "unknown";
          const toolArgs = JSON.stringify(block.input || {}).slice(0, 200);

          if (toolName === lastToolName && toolArgs === lastToolArgs) {
            consecutiveSameTool++;
            if (consecutiveSameTool >= 2) signals.retryPatterns++;
          } else {
            consecutiveSameTool = 0;
          }

          if (toolName === "Bash" || toolName === "bash") {
            consecutiveBashCount++;
            if (consecutiveBashCount >= 5) {
              signals.explorationSpirals++;
              consecutiveBashCount = 0;
            }
          } else {
            consecutiveBashCount = 0;
          }

          const inputStr = JSON.stringify(block.input || {});
          const fileMatch = inputStr.match(/["']([^"']+\.\w{1,5})["']/);
          if (fileMatch) {
            const currentFile = fileMatch[1];
            if (lastFileContext && currentFile !== lastFileContext) signals.contextSwitches++;
            lastFileContext = currentFile;
          }

          messages.push("TOOL: " + toolName + " " + toolArgs.slice(0, 150));
          lastToolName = toolName;
          lastToolArgs = toolArgs;
        }
      }
      if (textBuf) messages.push("ASSISTANT: " + textBuf.slice(0, 1000));
    }

    // User: plain text or tool_result blocks
    if (entry.type === "user" && entry.message?.content) {
      const content = entry.message.content;
      if (Array.isArray(content)) {
        for (const block of content) {
          if (block.type === "tool_result") {
            const text =
              typeof block.content === "string"
                ? block.content
                : JSON.stringify(block.content || "");
            if (block.is_error) {
              signals.toolErrors++;
              signals.errorMessages.push(text.slice(0, 200));
              messages.push("TOOL_ERROR: " + text.slice(0, 200));
            }
            if (/permission denied|EACCES|EPERM|not permitted|unauthorized/i.test(text)) {
              signals.permissionDenials++;
            }
          }
        }
      } else if (typeof content === "string") {
        messages.push("USER: " + content.slice(0, 500));
      }
    }
  }

  let condensed = messages.join("\n\n");
  if (condensed.length > MAX_TRANSCRIPT_CHARS) {
    condensed = condensed.slice(0, MAX_TRANSCRIPT_CHARS) + "\n...[TRUNCATED]";
  }

  return { signals, condensed };
}

/** Build the single combined prompt: narrative memory + diagnosis, one JSON shape. */
function buildCombinedPrompt(condensed, signals, existingMemory) {
  const signalsBlock = [
    `Total turns: ${signals.totalTurns}`,
    `Total tool calls: ${signals.totalToolCalls}`,
    `Tool errors: ${signals.toolErrors}`,
    `Retry patterns: ${signals.retryPatterns}`,
    `Exploration spirals (5+ sequential bash): ${signals.explorationSpirals}`,
    `Context switches: ${signals.contextSwitches}`,
    `Permission denials: ${signals.permissionDenials}`,
  ].join("\n");

  const errorBlock =
    signals.errorMessages.length > 0
      ? `\nError samples:\n${signals.errorMessages.slice(0, 10).join("\n")}\n`
      : "";

  const recentMilestones = Array.isArray(existingMemory?.milestones)
    ? existingMemory.milestones.slice(-15).map((m) => (typeof m === "string" ? m : `[#${m.c}] ${m.t}`))
    : [];
  const priorBlock = existingMemory
    ? `
This is compaction #${(existingMemory.compactionCount || 0) + 1}. Prior memory:
${JSON.stringify(
  {
    projectContext: existingMemory.projectContext,
    overallDirection: existingMemory.overallDirection,
    recentMilestones,
    longTermNarrative: existingMemory.longTermNarrative,
  },
  null,
  2,
)}
`
    : "This is the first compaction of this session.";

  return `You are a Claude Code session analyst. Produce both (a) narrative memory for the next session window and (b) efficiency diagnosis.

${priorBlock}

Pre-computed signals:
${signalsBlock}
${errorBlock}
CONDENSED TRANSCRIPT:
${condensed}

Respond ONLY with valid JSON in this exact shape:
{
  "memory": {
    "projectContext": "one-line: what codebase/project",
    "overallDirection": "1-2 sentences: the current high-level goal / what the user is working toward now",
    "newMilestones": ["1-4 terse past-tense bullets of MAJOR events, decisions, or goals reached in THIS window ONLY (high-level punch list, NOT per-edit detail). Do NOT repeat anything already in recentMilestones. Use [] if nothing significant happened."],
    "longTermNarrative": "2-3 sentence story of the session's progression so far (omit on first compaction)"
  },
  "diagnosis": {
    "efficiency": <integer 1-10>,
    "patterns": ["failure patterns or wasted-turn patterns observed (empty array if none)"],
    "lessons": ["concrete lessons for future sessions (use ['Session completed without significant issues'] for clean runs)"],
    "improvements": ["actionable improvements to prompts, tools, or workflow (empty if none)"]
  }
}

If memory updates would result in placeholder text like "Unknown" or "In progress", instead carry forward the prior memory fields verbatim.`;
}

/** Load prior memory, treating poisoned/unreadable as "none". */
function loadExistingMemory(memoryPath) {
  if (!existsSync(memoryPath)) return null;
  try {
    const mem = JSON.parse(readFileSync(memoryPath, "utf-8"));
    if (isPoisonedMemory(mem)) return null;
    return mem;
  } catch {
    return null;
  }
}

/**
 * Resolve where lessons.jsonl lives. Prefer the project-local context-layer
 * (CLAUDE_PROJECT_DIR/.claude/context-layer) when set; otherwise fall back to a
 * portable dir derived from this file's location — never an absolute home path.
 */
function resolveLessonsPath() {
  const projectDir = process.env.CLAUDE_PROJECT_DIR;
  if (projectDir) {
    const primaryDir = join(projectDir, ".claude", "context-layer");
    try {
      mkdirSync(primaryDir, { recursive: true });
      return join(primaryDir, "lessons.jsonl");
    } catch {
      /* fall through to the portable default */
    }
  }
  const fallbackDir = join(HOOK_ROOT, "context-layer");
  mkdirSync(fallbackDir, { recursive: true });
  return join(fallbackDir, "lessons.jsonl");
}

/**
 * Write memory. If the new fields are poisoned, preserve real prior memory
 * (bumping the compaction count) instead of overwriting it.
 */
function writeMemory(memoryPath, sessionId, memoryFields, existingMemory) {
  if (isPoisonedMemory(memoryFields)) {
    if (hasRealContent(existingMemory)) {
      const preserved = {
        ...existingMemory,
        sessionId,
        lastCompactionAt: new Date().toISOString(),
        compactionCount: (existingMemory.compactionCount || 0) + 1,
      };
      writeFileSync(memoryPath, JSON.stringify(preserved, null, 2));
    }
    return;
  }

  const compactionCount = (existingMemory?.compactionCount || 0) + 1;

  // Append-only punch list: keep prior milestones verbatim, add this window's.
  const priorMilestones = Array.isArray(existingMemory?.milestones) ? existingMemory.milestones : [];
  const freshMilestones = (memoryFields.newMilestones || [])
    .filter((m) => typeof m === "string" && m.trim())
    .map((t) => ({ c: compactionCount, t: t.trim() }));
  const milestones = [...priorMilestones, ...freshMilestones].slice(-MAX_MILESTONES);

  const memory = {
    sessionId,
    startedAt: existingMemory?.startedAt || new Date().toISOString(),
    lastCompactionAt: new Date().toISOString(),
    compactionCount,
    projectContext: memoryFields.projectContext,
    overallDirection: memoryFields.overallDirection,
    milestones,
    longTermNarrative: memoryFields.longTermNarrative,
  };
  writeFileSync(memoryPath, JSON.stringify(memory, null, 2));
}

/** Append one diagnosis entry (plus raw signals) to lessons.jsonl. */
function writeLesson(sessionId, diagnosisFields, signals) {
  const lessonsPath = resolveLessonsPath();
  const entry = {
    timestamp: new Date().toISOString(),
    type: "trace-diagnosis",
    session_id: sessionId,
    efficiency: diagnosisFields.efficiency ?? null,
    patterns: diagnosisFields.patterns || [],
    lessons: diagnosisFields.lessons || [],
    improvements: diagnosisFields.improvements || [],
    stats: {
      totalTurns: signals.totalTurns,
      totalToolCalls: signals.totalToolCalls,
      toolErrors: signals.toolErrors,
      retryPatterns: signals.retryPatterns,
      explorationSpirals: signals.explorationSpirals,
      contextSwitches: signals.contextSwitches,
      permissionDenials: signals.permissionDenials,
    },
  };
  appendFileSync(lessonsPath, JSON.stringify(entry) + "\n");
}

/** PreCompact entry point: one LLM call, two sinks. */
export async function runPreCompact(event, config, apiKey) {
  try {
    const { session_id, transcript_path } = event;
    if (!session_id || !transcript_path) return;
    if (!existsSync(transcript_path)) return;

    const transcript = readFileSync(transcript_path, "utf-8");
    const memoryPath = join(MEMORIES_DIR, `${session_id}.json`);
    const existingMemory = loadExistingMemory(memoryPath);

    const { signals, condensed } = parseTranscript(transcript, existingMemory);

    // Too short to learn from: skip everything.
    if (signals.totalToolCalls < MIN_TOOL_CALLS) return;

    // No key: preserve existing memory, write a signal-only lesson, no LLM call.
    if (!apiKey) {
      if (hasRealContent(existingMemory)) {
        writeMemory(memoryPath, session_id, existingMemory, existingMemory);
      }
      writeLesson(
        session_id,
        {
          efficiency: null,
          patterns: signals.errorMessages.slice(0, 5),
          lessons: ["No API key available for full diagnosis"],
          improvements: [],
        },
        signals,
      );
      return;
    }

    // Per-compaction work uses the cheap `summarize` role (falls back to recall
    // only if summarize is somehow unconfigured).
    const roleConfig = config.llm?.summarize || config.llm?.recall;
    if (!roleConfig) {
      if (hasRealContent(existingMemory)) {
        writeMemory(memoryPath, session_id, existingMemory, existingMemory);
      }
      return;
    }

    const prompt = buildCombinedPrompt(condensed, signals, existingMemory);

    let result = null;
    try {
      result = await callLlm(apiKey, roleConfig, prompt, {
        timeoutMs: LLM_TIMEOUT_MS,
        format: "json",
      });
    } catch (err) {
      if (process.env.DEBUG) process.stderr.write("[precompact-llm] LLM failed: " + err.message + "\n");
    }

    if (!result || typeof result !== "object") {
      // LLM failure: preserve real memory, write a basic lesson.
      if (hasRealContent(existingMemory)) {
        writeMemory(memoryPath, session_id, existingMemory, existingMemory);
      }
      writeLesson(
        session_id,
        {
          efficiency: null,
          patterns: [],
          lessons: ["LLM diagnosis unavailable for this compaction"],
          improvements: [],
        },
        signals,
      );
      return;
    }

    const memoryFields = result.memory || {};
    const diagnosisFields = result.diagnosis || {};

    writeMemory(memoryPath, session_id, memoryFields, existingMemory);
    writeLesson(session_id, diagnosisFields, signals);
  } catch (err) {
    if (process.env.DEBUG) process.stderr.write("[precompact-llm] error: " + err.message + "\n");
  }
}
