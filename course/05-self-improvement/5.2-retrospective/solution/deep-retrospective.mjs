// deep-retrospective.mjs — the wide-angle view.
//
// Where /evolve reads only lessons.jsonl, /retrospective reads EVERYTHING the
// harness has accumulated: session-memory summaries, the file-edit history, and
// the rolling tool logs. It aggregates all of it, then asks the `recall` role
// for META-LEARNINGS that span projects and time — not "what went wrong in one
// session" but "how does this person work, across months."
//
// Run occasionally (e.g. every ~50 sessions). Output is a REPORT FILE for the
// human to read; like /evolve, it changes no config and applies nothing.
//
// Anchored to reference/hooks/unified/modules/deep-retrospective.mjs,
// simplified: three local data sources instead of seven, and Claude Code's own
// global history is left out (the reference reads it from ~/.claude when present).
// Storage derives from this file's location — no absolute home paths.

import { readFileSync, writeFileSync, appendFileSync, existsSync, readdirSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { callLlm } from "./llm-call.mjs";
import { getApiKey } from "./api-key.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const MEMORIES_DIR = join(HERE, "memories");
const LOGS_DIR = join(HERE, "logs");
const RETRO_DIR = join(HERE, "evolution");
const RETRO_HISTORY = join(RETRO_DIR, "retrospective-history.jsonl");

// ── Stage 1: extract each data source into a small summary ──────────────────

/** Session-memory summaries + a frequency tally of recurring themes. */
export function extractSessionMemories() {
  if (!existsSync(MEMORIES_DIR)) return null;
  const files = readdirSync(MEMORIES_DIR).filter((f) => f.endsWith(".json"));
  if (files.length === 0) return null;

  const sessions = [];
  const themes = {};
  for (const file of files) {
    try {
      const data = JSON.parse(readFileSync(join(MEMORIES_DIR, file), "utf-8"));
      sessions.push({
        id: file.replace(".json", ""),
        direction: data.overallDirection || "",
        project: data.projectContext || "",
      });
      const text = (data.overallDirection || "").toLowerCase();
      for (const kw of ["fix", "bug", "deploy", "refactor", "test", "auth", "api", "ui", "config", "review"]) {
        if (text.includes(kw)) themes[kw] = (themes[kw] || 0) + 1;
      }
    } catch {
      /* skip malformed */
    }
  }
  return {
    totalSessions: sessions.length,
    topThemes: Object.entries(themes).sort((a, b) => b[1] - a[1]).slice(0, 10),
    sessions: sessions.slice(-20),
  };
}

/** File-edit churn: which files were touched most, across how many sessions. */
export function extractFileEdits() {
  const dbPath = join(LOGS_DIR, "file-edits.json");
  if (!existsSync(dbPath)) return null;
  let db;
  try {
    db = JSON.parse(readFileSync(dbPath, "utf-8"));
  } catch {
    return null;
  }
  if (!db.files) return null;

  const files = Object.entries(db.files);
  const totalEdits = files.reduce((sum, [, f]) => sum + (f.editCount || 0), 0);
  const mostEdited = files
    .sort((a, b) => (b[1].editCount || 0) - (a[1].editCount || 0))
    .slice(0, 15)
    .map(([path, data]) => ({ path, edits: data.editCount || 0, sessions: data.sessions || 0 }));

  return { totalFiles: files.length, totalEdits, mostEdited };
}

/** Tool-usage + error frequencies from the rolling logs. */
export function extractToolPatterns() {
  if (!existsSync(LOGS_DIR)) return null;
  const logFiles = readdirSync(LOGS_DIR).filter((f) => f.endsWith(".jsonl"));
  if (logFiles.length === 0) return null;

  const toolCounts = {};
  const toolErrors = {};
  let totalOps = 0;
  for (const file of logFiles) {
    try {
      for (const line of readFileSync(join(LOGS_DIR, file), "utf-8").trim().split("\n")) {
        try {
          const entry = JSON.parse(line);
          totalOps++;
          const tool = entry.tool_name || "unknown";
          toolCounts[tool] = (toolCounts[tool] || 0) + 1;
          if (entry.output_summary && /error|failed|ENOENT/i.test(entry.output_summary)) {
            toolErrors[tool] = (toolErrors[tool] || 0) + 1;
          }
        } catch {
          /* skip malformed */
        }
      }
    } catch {
      /* skip unreadable */
    }
  }
  return {
    totalOperations: totalOps,
    toolUsage: Object.entries(toolCounts).sort((a, b) => b[1] - a[1]).slice(0, 15),
    toolErrors: Object.entries(toolErrors).sort((a, b) => b[1] - a[1]).slice(0, 10),
  };
}

// ── Stage 2: aggregate all sources into one object ──────────────────────────

export function aggregateAll() {
  return {
    extractedAt: new Date().toISOString(),
    sessions: extractSessionMemories(),
    edits: extractFileEdits(),
    tools: extractToolPatterns(),
  };
}

// ── Stage 3: synthesize with the recall role ────────────────────────────────

function buildPrompt(data) {
  return `You are analyzing one user's complete Claude Code history: ${data.sessions?.totalSessions || 0} sessions, ${data.edits?.totalEdits || 0} file edits, ${data.tools?.totalOperations || 0} tool operations.

Extract META-LEARNINGS that span across projects and time — not single sessions.

## Sessions (${data.sessions?.totalSessions || 0})
Top themes: ${(data.sessions?.topThemes || []).map(([t, c]) => `${t}(${c})`).join(", ") || "none"}
Recent: ${(data.sessions?.sessions || []).slice(-10).map((s) => `[${s.project || "?"}] ${s.direction}`).join(" | ")}

## File edit churn (${data.edits?.totalEdits || 0} edits / ${data.edits?.totalFiles || 0} files)
${(data.edits?.mostEdited || []).slice(0, 10).map((f) => `  ${f.path}: ${f.edits} edits in ${f.sessions} sessions`).join("\n")}

## Tool usage (${data.tools?.totalOperations || 0} ops)
Frequency: ${(data.tools?.toolUsage || []).map(([t, c]) => `${t}(${c})`).join(", ")}
Errors: ${(data.tools?.toolErrors || []).map(([t, c]) => `${t}(${c})`).join(", ") || "none"}

Respond with valid JSON:
{
  "meta_learnings": [
    { "title": "short", "insight": "2-3 sentences", "evidence": "cite numbers", "confidence": "high|medium|low" }
  ],
  "harness_recommendations": [
    { "target": "CLAUDE.md | config | hook | workflow", "change": "specific", "priority": "high|medium|low" }
  ],
  "efficiency_report": { "overall_health": "1-10", "trend": "improving|stable|declining", "biggest_opportunity": "one thing" }
}`;
}

export async function synthesize(aggregated, config) {
  const apiKey = getApiKey();
  if (!apiKey) throw new Error("No API key — set LLM_API_KEY to run /retrospective.");
  const roleConfig = config.llm?.recall;
  if (!roleConfig) throw new Error("No recall role configured in config.json.");
  return await callLlm(apiKey, roleConfig, buildPrompt(aggregated), { timeoutMs: 60_000, format: "json" });
}

// ── Stage 4: render the report ──────────────────────────────────────────────

export function formatReport(result, aggregated) {
  const today = new Date().toISOString().split("T")[0];
  let md = `# Deep Retrospective Report
> Generated: ${today}
> Sessions: ${aggregated.sessions?.totalSessions || 0} | Edits: ${aggregated.edits?.totalEdits || 0} | Tool ops: ${aggregated.tools?.totalOperations || 0}

## Efficiency
- **Health**: ${result.efficiency_report?.overall_health || "?"}/10
- **Trend**: ${result.efficiency_report?.trend || "unknown"}
- **Biggest opportunity**: ${result.efficiency_report?.biggest_opportunity || "N/A"}

---

## Meta-Learnings

`;
  for (const ml of result.meta_learnings || []) {
    md += `### ${ml.title}
**Insight**: ${ml.insight}
**Evidence**: ${ml.evidence}
**Confidence**: ${ml.confidence}

`;
  }
  md += `---

## Harness Recommendations

`;
  for (const rec of result.harness_recommendations || []) {
    md += `### [${(rec.priority || "?").toUpperCase()}] ${rec.change}
- **Target**: ${rec.target}

`;
  }
  return md;
}

// ── Entry point ─────────────────────────────────────────────────────────────

export async function retrospective(config) {
  if (!existsSync(RETRO_DIR)) mkdirSync(RETRO_DIR, { recursive: true });

  const aggregated = aggregateAll();
  const hasData = (aggregated.sessions?.totalSessions || 0) > 0 || (aggregated.tools?.totalOperations || 0) > 0;
  if (!hasData) {
    return { success: false, message: "No history found. Use the harness for a while first.", reportPath: null };
  }

  let result;
  try {
    result = await synthesize(aggregated, config);
  } catch (err) {
    // Never lose the aggregation: dump the raw data even when the LLM fails.
    const rawPath = join(RETRO_DIR, `retrospective-raw-${new Date().toISOString().split("T")[0]}.json`);
    writeFileSync(rawPath, JSON.stringify(aggregated, null, 2));
    return { success: false, message: `LLM synthesis failed (${err.message}); raw data saved.`, reportPath: rawPath };
  }
  if (!result) {
    return { success: false, message: "The LLM returned no analysis (no key, or an API issue).", reportPath: null };
  }

  const dateStr = new Date().toISOString().split("T")[0];
  const reportPath = join(RETRO_DIR, `retrospective-${dateStr}.md`);
  writeFileSync(reportPath, formatReport(result, aggregated));

  appendFileSync(
    RETRO_HISTORY,
    JSON.stringify({
      timestamp: new Date().toISOString(),
      sessionsAnalyzed: aggregated.sessions?.totalSessions || 0,
      metaLearnings: result.meta_learnings?.length || 0,
    }) + "\n",
  );

  return {
    success: true,
    message: `Retrospective complete. ${result.meta_learnings?.length || 0} meta-learnings written for review.`,
    reportPath,
    learningCount: result.meta_learnings?.length || 0,
  };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const configPath = join(HERE, "config.json");
  const config = existsSync(configPath) ? JSON.parse(readFileSync(configPath, "utf-8")) : {};
  retrospective(config).then((r) => {
    console.log(r.message);
    if (r.reportPath) console.log(`→ ${r.reportPath}`);
    process.exit(r.success ? 0 : 1);
  });
}
