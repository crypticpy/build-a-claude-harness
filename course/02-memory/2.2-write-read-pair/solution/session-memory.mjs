// session-memory.mjs — the Memento pattern, both halves in one file.
//
// A model is STATELESS: when Claude Code compacts the conversation, the running
// transcript is discarded and the model forgets what you were doing. The fix is
// a write→read loop across two events:
//
//   WRITE  on `precompact`  → save a note to memories/<session>.json
//   READ   on `prompt`      → load that note, print a <session-memory> block
//
// Right now the note is HARDCODED — a fixed string. That's on purpose: it proves
// the whole loop works with NO LLM, no key, no cost. In lesson 2.3b you'll swap
// the hardcoded note for a real model-written summary; the loop stays the same.
//
// Anchored to reference/hooks/unified/modules/session-memory.mjs (read side) and
// modules/precompact-llm.mjs (write side), simplified hard: no LLM, no poison
// detection, no tool-count gate. (No gate is deliberate — it means a single
// /compact triggers a real write you can see immediately.)

import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

// Storage lives beside THIS script — never an absolute home-directory path.
const HERE = dirname(fileURLToPath(import.meta.url));
const MEMORIES_DIR = join(HERE, "memories");

// ── WRITE SIDE: runs on `precompact`, just before the model forgets ──────────
/** Write this session's memory note to memories/<session>.json. */
export function writeMemory(event) {
  try {
    const { session_id } = event;
    if (!session_id) return;

    mkdirSync(MEMORIES_DIR, { recursive: true });
    const memoryPath = join(MEMORIES_DIR, `${session_id}.json`);

    // Carry the start time forward across compactions; count the compactions.
    let prior = {};
    if (existsSync(memoryPath)) {
      try {
        prior = JSON.parse(readFileSync(memoryPath, "utf-8"));
      } catch {
        prior = {};
      }
    }

    // THE HARDCODED NOTE. In 2.3b this becomes a real LLM summary of the session.
    const memory = {
      sessionId: session_id,
      startedAt: prior.startedAt || new Date().toISOString(),
      lastCompactionAt: new Date().toISOString(),
      compactionCount: (prior.compactionCount || 0) + 1,
      projectContext: "Learning the Memento pattern in Part 2 of the harness course",
      overallDirection: "Proving the write→read memory loop works with a hardcoded note",
      milestones: [
        ...(Array.isArray(prior.milestones) ? prior.milestones : []),
        "Wrote a session-memory note on PreCompact",
      ],
    };

    writeFileSync(memoryPath, JSON.stringify(memory, null, 2));
  } catch (err) {
    if (process.env.DEBUG) console.error("[session-memory write]", err);
  }
}

// ── READ SIDE: runs on `prompt`, before each user prompt reaches the model ───
/** Read this session's memory and render it as a <session-memory> block, or null. */
export function injectMemory(event) {
  try {
    const { session_id } = event;
    if (!session_id) return null;

    const memoryPath = join(MEMORIES_DIR, `${session_id}.json`);
    if (!existsSync(memoryPath)) return null; // no memory yet → nothing to inject

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
//   echo '{"session_id":"demo"}' | node session-memory.mjs precompact   (write)
//   echo '{"session_id":"demo"}' | node session-memory.mjs prompt       (read)
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
    writeMemory(event);
  } else if (eventType === "prompt") {
    const block = injectMemory(event);
    if (block) console.log(block);
  }
  process.exit(0);
}
