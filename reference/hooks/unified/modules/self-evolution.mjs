/**
 * Self-evolution — close the feedback loop.
 *
 * Reads the lessons.jsonl entries and session memories the harness has been
 * accumulating, aggregates them into pattern frequencies, and asks the LLM to
 * propose a handful of concrete, evidence-backed harness improvements
 * (CLAUDE.md, config, a hook module, a command). The proposals are written to
 * evolution/ for the user to review — nothing is applied automatically.
 *
 * Runs on demand via /evolve, so it uses the higher-budget `recall` role.
 * A minimum-sessions gate avoids spending tokens before there's enough signal.
 *
 * All storage (lessons, memories, evolution output) is derived from this file's
 * location — no absolute home paths.
 */

import {
  readFileSync,
  writeFileSync,
  appendFileSync,
  existsSync,
  readdirSync,
  mkdirSync,
  statSync,
} from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { callLlm } from "./llm-call.mjs";
import { getApiKey } from "./api-key.mjs";
import { isPoisonedMemory } from "./session-memory.mjs";

// Storage derives from this file's location (modules/ -> hooks/unified/).
const HOOK_ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
const MEMORIES_DIR = join(HOOK_ROOT, "memories");
const EVOLUTION_DIR = join(HOOK_ROOT, "evolution");
const PROPOSALS_FILE = join(EVOLUTION_DIR, "proposals.md");
const HISTORY_FILE = join(EVOLUTION_DIR, "history.jsonl");
const CONFIG_FILE = join(HOOK_ROOT, "config.json");

/** Collect lessons from the project-local and hook-local context-layer dirs. */
function collectLessons() {
  const paths = new Set();

  const projectDir = process.env.CLAUDE_PROJECT_DIR;
  if (projectDir) {
    const projectPath = join(projectDir, ".claude", "context-layer", "lessons.jsonl");
    if (existsSync(projectPath)) paths.add(projectPath);
  }
  const localPath = join(HOOK_ROOT, "context-layer", "lessons.jsonl");
  if (existsSync(localPath)) paths.add(localPath);

  const allEntries = [];
  for (const p of paths) {
    try {
      const content = readFileSync(p, "utf-8").trim();
      if (!content) continue;
      for (const line of content.split("\n")) {
        try {
          const entry = JSON.parse(line.trim());
          entry._source = p;
          allEntries.push(entry);
        } catch {
          /* skip malformed */
        }
      }
    } catch {
      /* skip inaccessible */
    }
  }

  return allEntries;
}

/** Collect recent session memory summaries for cross-session context. */
function collectSessionMemories(limit = 20) {
  if (!existsSync(MEMORIES_DIR)) return [];

  try {
    const files = readdirSync(MEMORIES_DIR)
      .filter((f) => f.endsWith(".json"))
      .map((f) => ({ name: f, mtime: statSync(join(MEMORIES_DIR, f)).mtimeMs }))
      .sort((a, b) => a.mtime - b.mtime)
      .slice(-limit)
      .map((f) => f.name);

    const memories = [];
    for (const file of files) {
      try {
        const data = JSON.parse(readFileSync(join(MEMORIES_DIR, file), "utf-8"));
        // see session-memory.mjs for what a "poisoned" memory means
        if (isPoisonedMemory(data)) continue;
        if (data.projectContext || data.overallDirection || data.keyPoints?.length || data.milestones?.length) {
          memories.push({
            session: file.replace(".json", ""),
            projectContext: data.projectContext || "",
            direction: data.overallDirection || "",
            keyPoints:
              data.keyPoints ||
              (data.milestones || []).map((m) => (typeof m === "string" ? m : m?.t)).filter(Boolean),
            compactions: data.compactionCount || 0,
            timestamp: data.startedAt || data.lastCompactionAt || null,
          });
        }
      } catch {
        /* skip malformed */
      }
    }
    return memories;
  } catch {
    return [];
  }
}

/** Aggregate diagnosis entries into pattern frequencies + rolled-up stats. */
function aggregatePatterns(entries) {
  const diagnosisEntries = entries.filter((e) => e.type === "trace-diagnosis");
  const otherEntries = entries.filter((e) => e.type !== "trace-diagnosis");

  const allLessons = [];
  const allPatterns = [];
  const allImprovements = [];
  const efficiencyScores = [];
  const stats = {
    totalSessions: diagnosisEntries.length,
    totalToolErrors: 0,
    totalRetryPatterns: 0,
    totalExplorationSpirals: 0,
    totalContextSwitches: 0,
    totalPermissionDenials: 0,
  };

  for (const entry of diagnosisEntries) {
    if (Array.isArray(entry.lessons)) allLessons.push(...entry.lessons);
    if (Array.isArray(entry.patterns)) allPatterns.push(...entry.patterns);
    if (Array.isArray(entry.improvements)) allImprovements.push(...entry.improvements);
    if (entry.efficiency != null) efficiencyScores.push(entry.efficiency);
    if (entry.stats) {
      stats.totalToolErrors += entry.stats.toolErrors || 0;
      stats.totalRetryPatterns += entry.stats.retryPatterns || 0;
      stats.totalExplorationSpirals += entry.stats.explorationSpirals || 0;
      stats.totalContextSwitches += entry.stats.contextSwitches || 0;
      stats.totalPermissionDenials += entry.stats.permissionDenials || 0;
    }
  }

  for (const entry of otherEntries) {
    if (entry.lesson) allLessons.push(entry.lesson);
    if (entry.summary) allLessons.push(entry.summary);
  }

  const avgEfficiency =
    efficiencyScores.length > 0
      ? Math.round((efficiencyScores.reduce((a, b) => a + b, 0) / efficiencyScores.length) * 10) / 10
      : null;

  return {
    lessons: allLessons,
    patterns: allPatterns,
    improvements: allImprovements,
    stats,
    avgEfficiency,
    sessionCount: entries.length,
    diagnosisCount: diagnosisEntries.length,
  };
}

/** Ask the recall LLM to synthesize aggregated data into proposals. */
async function synthesizeProposals(aggregated, memories, config) {
  const apiKey = getApiKey();
  if (!apiKey) throw new Error("No API key available for evolution synthesis");

  const roleConfig = config.llm?.recall;
  if (!roleConfig) throw new Error("No recall LLM configured");

  // Include the current hook config as context for grounded proposals.
  let currentConfig = "";
  if (existsSync(CONFIG_FILE)) {
    try {
      currentConfig = readFileSync(CONFIG_FILE, "utf-8");
    } catch {
      /* config is optional context */
    }
  }

  const prompt = `You are a Claude Code harness optimizer. Analyze accumulated session data and propose specific improvements.

## Accumulated Data (${aggregated.sessionCount} sessions, ${aggregated.diagnosisCount} diagnosed)

### Aggregate Stats
- Average efficiency: ${aggregated.avgEfficiency || "N/A"}/10
- Total tool errors: ${aggregated.stats.totalToolErrors}
- Total retry patterns: ${aggregated.stats.totalRetryPatterns}
- Total exploration spirals: ${aggregated.stats.totalExplorationSpirals}
- Total context switches: ${aggregated.stats.totalContextSwitches}
- Total permission denials: ${aggregated.stats.totalPermissionDenials}

### Recurring Lessons (${aggregated.lessons.length} total)
${aggregated.lessons.slice(0, 30).map((l, i) => `${i + 1}. ${l}`).join("\n")}

### Observed Patterns (${aggregated.patterns.length} total)
${aggregated.patterns.slice(0, 20).map((p, i) => `${i + 1}. ${p}`).join("\n")}

### Suggested Improvements from Past Sessions
${aggregated.improvements.slice(0, 20).map((imp, i) => `${i + 1}. ${imp}`).join("\n")}

### Recent Session Summaries
${memories
  .slice(0, 10)
  .map(
    (m) =>
      "- [" +
      m.session +
      "] " +
      (m.projectContext || "unknown") +
      ": " +
      (m.direction || m.keyPoints.join("; ") || "(no summary)").slice(0, 200),
  )
  .join("\n")}

## Current Harness State

### Hook Config
${currentConfig.slice(0, 2000)}

## Task

Based on the recurring patterns above, propose 3-7 specific, actionable changes to improve the harness. Each proposal should:
1. Target a specific file (CLAUDE.md, config.json, a hook module, or a command)
2. Describe the exact change
3. Explain why (which recurring pattern it addresses)
4. Rate confidence (high/medium/low) based on how many sessions support it

IMPORTANT: Only propose changes backed by MULTIPLE sessions or STRONG signals. Don't propose speculative improvements.

Respond with valid JSON:
{
  "summary": "1-2 sentence overall assessment",
  "proposals": [
    {
      "id": "prop-1",
      "title": "Short title",
      "target": "file path or component name",
      "change": "Specific description of what to change",
      "rationale": "Why — which pattern(s) this addresses",
      "confidence": "high|medium|low",
      "category": "config|behavior|hook|command|memory"
    }
  ],
  "health": {
    "score": 1-10,
    "trend": "improving|stable|declining",
    "topIssue": "The single most impactful issue to fix"
  }
}`;

  return await callLlm(apiKey, roleConfig, prompt, { timeoutMs: 45_000, format: "json" });
}

/** Render proposals as a readable markdown document. */
function formatProposalsMarkdown(result, aggregated) {
  const now = new Date().toISOString().split("T")[0];
  let md = `# Harness Evolution Proposals
> Generated: ${now} | Sessions analyzed: ${aggregated.sessionCount} | Diagnosed: ${aggregated.diagnosisCount}

## Health Assessment
- **Score**: ${result.health?.score || "?"}/10
- **Trend**: ${result.health?.trend || "unknown"}
- **Top Issue**: ${result.health?.topIssue || "None identified"}
- **Avg Session Efficiency**: ${aggregated.avgEfficiency || "N/A"}/10

## Summary
${result.summary || "No summary available."}

---

## Proposals

`;

  if (result.proposals && result.proposals.length > 0) {
    for (const p of result.proposals) {
      md += `### ${p.id}: ${p.title}
- **Target**: \`${p.target}\`
- **Confidence**: ${p.confidence}
- **Category**: ${p.category}

**Change**: ${p.change}

**Rationale**: ${p.rationale}

**Status**: [ ] Pending review

---

`;
    }
  } else {
    md += "_No proposals generated. The harness may already be well-optimized, or more session data is needed._\n";
  }

  md += `## Raw Stats
| Metric | Value |
|--------|-------|
| Sessions | ${aggregated.sessionCount} |
| Diagnosed | ${aggregated.diagnosisCount} |
| Tool Errors | ${aggregated.stats.totalToolErrors} |
| Retry Patterns | ${aggregated.stats.totalRetryPatterns} |
| Exploration Spirals | ${aggregated.stats.totalExplorationSpirals} |
| Context Switches | ${aggregated.stats.totalContextSwitches} |
| Permission Denials | ${aggregated.stats.totalPermissionDenials} |
`;

  return md;
}

/** Run the self-evolution analysis. Returns a result object for display. */
export async function evolve(config) {
  if (!existsSync(EVOLUTION_DIR)) mkdirSync(EVOLUTION_DIR, { recursive: true });

  const lessons = collectLessons();
  const memories = collectSessionMemories();

  if (lessons.length === 0 && memories.length === 0) {
    return {
      success: false,
      message:
        "No lesson data found. The self-evolution loop needs session data from the PreCompact hook. Run a few sessions with significant tool usage first.",
      proposalsPath: null,
    };
  }

  // Gate: require minimum sessions before spending API credits.
  const minSessions = config.evolution?.minSessionsForAnalysis || 3;
  if (lessons.length < minSessions) {
    return {
      success: false,
      message: `Only ${lessons.length} lesson entries found (minimum: ${minSessions}). Run more sessions to accumulate data before evolution analysis.`,
      proposalsPath: null,
    };
  }

  const aggregated = aggregatePatterns(lessons);

  let result;
  try {
    result = await synthesizeProposals(aggregated, memories, config);
  } catch (err) {
    return {
      success: false,
      message: `Evolution synthesis failed: ${err.message}`,
      proposalsPath: null,
      aggregated,
    };
  }

  if (!result) {
    return {
      success: false,
      message: "LLM returned no proposals. This may indicate insufficient data or an API issue.",
      proposalsPath: null,
      aggregated,
    };
  }

  // Write proposals (versioned by date, plus a canonical copy).
  const dateStr = new Date().toISOString().split("T")[0];
  const versionedPath = join(EVOLUTION_DIR, `proposals-${dateStr}.md`);
  const markdown = formatProposalsMarkdown(result, aggregated);
  writeFileSync(versionedPath, markdown);
  writeFileSync(PROPOSALS_FILE, markdown);

  // Record history (atomic append).
  const historyEntry = {
    timestamp: new Date().toISOString(),
    sessionsAnalyzed: aggregated.sessionCount,
    diagnosedSessions: aggregated.diagnosisCount,
    avgEfficiency: aggregated.avgEfficiency,
    proposalCount: result.proposals?.length || 0,
    healthScore: result.health?.score || null,
    trend: result.health?.trend || null,
  };
  appendFileSync(HISTORY_FILE, JSON.stringify(historyEntry) + "\n");

  return {
    success: true,
    message: `Evolution analysis complete. ${result.proposals?.length || 0} proposals generated.`,
    proposalsPath: PROPOSALS_FILE,
    health: result.health,
    summary: result.summary,
    proposalCount: result.proposals?.length || 0,
    aggregated,
  };
}
