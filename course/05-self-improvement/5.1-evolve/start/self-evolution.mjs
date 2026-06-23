// self-evolution.mjs — close the feedback loop, with a human in the middle.
//
// The harness has been writing lessons to lessons.jsonl on every PreCompact
// (lesson 2.4). This module reads that pile back, aggregates it, asks the
// EXPENSIVE `recall` LLM role to turn the aggregate into a handful of concrete
// proposals, and WRITES THOSE PROPOSALS TO A FILE. It never touches CLAUDE.md,
// config, or a hook — a human reads proposals.md and applies what they agree
// with. Nothing here auto-applies. That is the whole lesson.
//
// You are filling in three function bodies (marked TODO). The orchestration
// (evolve, the gate, the file writes) and formatProposals are done for you.
// Anchored to reference/hooks/unified/modules/self-evolution.mjs.

import {
  readFileSync,
  writeFileSync,
  appendFileSync,
  existsSync,
  mkdirSync,
} from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { callLlm } from "./llm-call.mjs";
import { getApiKey } from "./api-key.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const LESSONS_FILE = join(HERE, "context-layer", "lessons.jsonl");
const EVOLUTION_DIR = join(HERE, "evolution");
const PROPOSALS_FILE = join(EVOLUTION_DIR, "proposals.md");
const HISTORY_FILE = join(EVOLUTION_DIR, "history.jsonl");

/**
 * Read every JSON line out of lessons.jsonl. Malformed lines are skipped, not
 * fatal. Returns an array of entry objects (possibly empty).
 *
 * @returns {object[]}
 */
export function collectLessons() {
  if (!existsSync(LESSONS_FILE)) return [];
  const content = readFileSync(LESSONS_FILE, "utf-8").trim();
  if (!content) return [];

  const entries = [];
  // TODO 1: split `content` on newlines; for each line, try/catch a JSON.parse
  // and push the parsed object into `entries`. A line that fails to parse must
  // be SKIPPED silently (a crashed hook can leave a half-written line) — never
  // let one bad line throw out of this function.
  return entries;
}

/**
 * Roll the raw entries into a small aggregate the prompt can fit: a flat list
 * of lesson strings, a list of suggested improvements, and how many distinct
 * sessions contributed. Frequency is the signal.
 *
 * @param {object[]} entries
 * @returns {{lessons:string[], improvements:string[], entryCount:number, sessionCount:number}}
 */
export function aggregate(entries) {
  const lessons = [];
  const improvements = [];
  const sessions = new Set();

  // TODO 2: loop over `entries`. For each entry `e`:
  //   - if e.session_id is set, add it to the `sessions` Set (counts distinct sessions);
  //   - if Array.isArray(e.lessons), push all of them into `lessons`;
  //     else if e.lesson is a string, push it;
  //   - if Array.isArray(e.improvements), push all of them into `improvements`.

  return {
    lessons,
    improvements,
    entryCount: entries.length,
    sessionCount: sessions.size,
  };
}

/**
 * Ask the `recall` role to synthesize the aggregate into proposals. This is the
 * ONE LLM call in /evolve. It uses the recall role — a BIGGER budget than the
 * per-compaction summarizer — because it runs rarely and quality is worth more
 * tokens. Returns the parsed JSON from the model, or null on any failure.
 *
 * @returns {Promise<object|null>}
 */
export async function synthesize(aggregated, config) {
  const apiKey = getApiKey();
  if (!apiKey) throw new Error("No API key — set LLM_API_KEY to run /evolve.");

  // TODO 3a: pull the recall role out of config (`config.llm?.recall`). If it's
  // missing, throw new Error("No recall role configured in config.json.").
  const roleConfig = /* your code */ null;
  if (!roleConfig) throw new Error("No recall role configured in config.json.");

  const prompt = `You are a Claude Code harness optimizer. Below are lessons the
harness extracted from ${aggregated.sessionCount} past sessions. Propose 3-7
concrete, evidence-backed improvements to the harness (CLAUDE.md, config, a hook,
or a command). Only propose changes backed by REPEATED signals — skip one-offs.

### Recurring lessons (${aggregated.lessons.length})
${aggregated.lessons.slice(0, 40).map((l, i) => `${i + 1}. ${l}`).join("\n")}

### Improvements suggested in past sessions (${aggregated.improvements.length})
${aggregated.improvements.slice(0, 20).map((s, i) => `${i + 1}. ${s}`).join("\n")}

Respond with valid JSON:
{
  "summary": "1-2 sentence overall assessment",
  "proposals": [
    { "id": "prop-1", "title": "short", "target": "file or component",
      "change": "exact change to make", "rationale": "which pattern this addresses",
      "confidence": "high|medium|low" }
  ]
}`;

  // TODO 3b: call the LLM. Use the recall `roleConfig` (NOT the summarize role)
  // and ask for JSON. Return the result:
  //   return await callLlm(apiKey, roleConfig, prompt, { timeoutMs: 45_000, format: "json" });
  return null;
}

/** Render the model's JSON into a human-readable, checkbox-tracked doc. (Done.) */
export function formatProposals(result, aggregated) {
  const today = new Date().toISOString().split("T")[0];
  let md = `# Harness Evolution Proposals
> Generated: ${today} | Sessions analyzed: ${aggregated.sessionCount} | Lessons: ${aggregated.lessons.length}

## Summary
${result.summary || "No summary."}

---

## Proposals

`;
  const proposals = result.proposals || [];
  if (proposals.length === 0) {
    md += "_No proposals generated. The harness may already be well-tuned, or more data is needed._\n";
  } else {
    for (const p of proposals) {
      md += `### ${p.id}: ${p.title}
- **Target**: \`${p.target}\`
- **Confidence**: ${p.confidence}

**Change**: ${p.change}

**Rationale**: ${p.rationale}

**Status**: [ ] Pending review

---

`;
    }
  }
  return md;
}

/**
 * The /evolve entry point. Gate → aggregate → synthesize → WRITE proposals.md
 * and append a history line. NEVER edits CLAUDE.md, config, or a hook —
 * applying is the human's job. (Done for you; study how it ends in a file.)
 */
export async function evolve(config) {
  if (!existsSync(EVOLUTION_DIR)) mkdirSync(EVOLUTION_DIR, { recursive: true });

  const entries = collectLessons();
  const aggregated = aggregate(entries);

  const minSessions = config.evolution?.minSessionsForAnalysis ?? 3;
  if (aggregated.sessionCount < minSessions) {
    return {
      success: false,
      message: `Only ${aggregated.sessionCount} session(s) of lessons (minimum: ${minSessions}). Run more sessions before evolving.`,
      proposalsPath: null,
    };
  }

  let result;
  try {
    result = await synthesize(aggregated, config);
  } catch (err) {
    return { success: false, message: `Evolution synthesis failed: ${err.message}`, proposalsPath: null };
  }
  if (!result) {
    return { success: false, message: "The LLM returned no proposals (no key, or an API issue).", proposalsPath: null };
  }

  const markdown = formatProposals(result, aggregated);
  writeFileSync(PROPOSALS_FILE, markdown);

  appendFileSync(
    HISTORY_FILE,
    JSON.stringify({
      timestamp: new Date().toISOString(),
      sessionsAnalyzed: aggregated.sessionCount,
      proposalCount: result.proposals?.length || 0,
    }) + "\n",
  );

  return {
    success: true,
    message: `Evolution complete. ${result.proposals?.length || 0} proposals written for review — nothing applied.`,
    proposalsPath: PROPOSALS_FILE,
    proposalCount: result.proposals?.length || 0,
  };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const configPath = join(HERE, "config.json");
  const config = existsSync(configPath) ? JSON.parse(readFileSync(configPath, "utf-8")) : {};
  evolve(config).then((r) => {
    console.log(r.message);
    if (r.proposalsPath) console.log(`→ ${r.proposalsPath}`);
    process.exit(r.success ? 0 : 1);
  });
}
