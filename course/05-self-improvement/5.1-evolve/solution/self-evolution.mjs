// self-evolution.mjs — close the feedback loop, with a human in the middle.
//
// The harness has been writing lessons to lessons.jsonl on every PreCompact
// (that's lesson 2.4). This module reads that pile back, aggregates it into a
// few frequency counts, asks the EXPENSIVE `recall` LLM role to turn the
// aggregate into a handful of concrete proposals, and WRITES THOSE PROPOSALS
// TO A FILE. It does not touch CLAUDE.md, config, or any hook. A human reads
// proposals.md and applies what they agree with. Nothing here auto-applies.
//
// Anchored to reference/hooks/unified/modules/self-evolution.mjs, simplified
// for teaching: lessons.jsonl only (no session-memory cross-reference, no
// poison filter), and the aggregate is the three counts that matter most.
//
// Storage derives from this file's location — no absolute home paths.

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

// Where things live, all relative to THIS file (not $HOME).
const HERE = dirname(fileURLToPath(import.meta.url));
const LESSONS_FILE = join(HERE, "context-layer", "lessons.jsonl");
const EVOLUTION_DIR = join(HERE, "evolution");
const PROPOSALS_FILE = join(EVOLUTION_DIR, "proposals.md");
const HISTORY_FILE = join(EVOLUTION_DIR, "history.jsonl");

/**
 * Read every JSON line out of lessons.jsonl. Malformed lines are skipped, not
 * fatal — a half-written line from a crashed hook must never stop /evolve.
 * Returns an array of entry objects (possibly empty).
 */
export function collectLessons() {
  if (!existsSync(LESSONS_FILE)) return [];
  const content = readFileSync(LESSONS_FILE, "utf-8").trim();
  if (!content) return [];

  const entries = [];
  for (const line of content.split("\n")) {
    try {
      entries.push(JSON.parse(line.trim()));
    } catch {
      /* skip a malformed/partial line */
    }
  }
  return entries;
}

/**
 * Roll the raw entries up into a small aggregate the prompt can fit: a flat
 * list of lesson strings, a list of suggested improvements, and a count of how
 * many distinct sessions contributed. Frequency is the signal — a lesson that
 * shows up across many sessions is worth a proposal; a one-off probably isn't.
 */
export function aggregate(entries) {
  const lessons = [];
  const improvements = [];
  const sessions = new Set();

  for (const e of entries) {
    if (e.session_id) sessions.add(e.session_id);
    // trace-diagnosis entries carry arrays; simpler entries carry a string.
    if (Array.isArray(e.lessons)) lessons.push(...e.lessons);
    else if (e.lesson) lessons.push(e.lesson);
    if (Array.isArray(e.improvements)) improvements.push(...e.improvements);
  }

  return {
    lessons,
    improvements,
    entryCount: entries.length,
    sessionCount: sessions.size,
  };
}

/**
 * Ask the `recall` role to synthesize the aggregate into proposals. This is the
 * one and only LLM call in /evolve. It uses the recall role — a BIGGER budget
 * and higher effort than the per-compaction summarizer — because it runs rarely
 * and the quality of its output is worth more tokens. Returns the parsed JSON
 * object from the model, or null on any failure (callLlm is fail-silent).
 */
export async function synthesize(aggregated, config) {
  const apiKey = getApiKey();
  if (!apiKey) throw new Error("No API key — set LLM_API_KEY to run /evolve.");

  const roleConfig = config.llm?.recall;
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

  // recall role: pricier budget, runs rarely. format:"json" parses the reply.
  return await callLlm(apiKey, roleConfig, prompt, { timeoutMs: 45_000, format: "json" });
}

/** Render the model's JSON into a human-readable, checkbox-tracked markdown doc. */
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
 * and append a history line. Returns a result object for the command to show.
 * It NEVER edits CLAUDE.md, config, or a hook — applying is the human's job.
 */
export async function evolve(config) {
  if (!existsSync(EVOLUTION_DIR)) mkdirSync(EVOLUTION_DIR, { recursive: true });

  const entries = collectLessons();
  const aggregated = aggregate(entries);

  // Gate: don't spend recall-tier tokens until there's real signal.
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

  // Write the proposals for the human to review. THIS is the only side effect
  // on the harness itself — a file in evolution/, not a change to any config.
  const markdown = formatProposals(result, aggregated);
  writeFileSync(PROPOSALS_FILE, markdown);

  // Append-only history of runs (atomic; parallel-safe, like the rolling log).
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

// Allow running standalone: `echo '{}' | node self-evolution.mjs`
// Reads a config.json next to this file (the recall role + the gate live there).
if (import.meta.url === `file://${process.argv[1]}`) {
  const configPath = join(HERE, "config.json");
  const config = existsSync(configPath) ? JSON.parse(readFileSync(configPath, "utf-8")) : {};
  evolve(config).then((r) => {
    console.log(r.message);
    if (r.proposalsPath) console.log(`→ ${r.proposalsPath}`);
    process.exit(r.success ? 0 : 1);
  });
}
