/**
 * Deep retrospective — the wide-angle view.
 *
 * Where /evolve reads only lessons.jsonl, this reads everything the harness and
 * Claude Code have accumulated: session memories, the file-edits database, the
 * rolling operation logs, and (when present) Claude Code's own prompt history,
 * project memory files, and stats cache. It aggregates all of it, then asks the
 * recall LLM for META-LEARNINGS that span projects, stacks, and time.
 *
 * Meant to be run occasionally (e.g. every ~50 sessions). Uses the higher-budget
 * `recall` role. Module-owned data (memories, logs, evolution output) is derived
 * from this file's location; Claude Code's own data is read from the standard
 * ~/.claude home when it exists — no project-specific paths are hardcoded.
 */

import { readFileSync, writeFileSync, appendFileSync, existsSync, readdirSync, mkdirSync } from "node:fs";
import { dirname, join, basename } from "node:path";
import { fileURLToPath } from "node:url";
import { callLlm } from "./llm-call.mjs";
import { getApiKey } from "./api-key.mjs";

// Module-owned storage derives from this file (modules/ -> hooks/unified/).
const HOOK_ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
const MEMORIES_DIR = join(HOOK_ROOT, "memories");
const LOGS_DIR = join(HOOK_ROOT, "logs");
const RETRO_DIR = join(HOOK_ROOT, "evolution");
const RETRO_HISTORY = join(RETRO_DIR, "retrospective-history.jsonl");

// Claude Code's own runtime data lives under the standard home, when present.
const CLAUDE_HOME = join(process.env.HOME || "", ".claude");
const HOME = process.env.HOME || "";

// ─── Stage 1: Data Extraction ────────────────────────────────────────

/** Prompt patterns from Claude Code's global history (if available). */
function extractPromptPatterns() {
  const historyPath = join(CLAUDE_HOME, "history.jsonl");
  if (!existsSync(historyPath)) return null;

  const content = readFileSync(historyPath, "utf-8").trim();
  if (!content) return null;

  const lines = content.split("\n");
  const stats = {
    totalPrompts: lines.length,
    promptsByProject: {},
    promptsByMonth: {},
    promptLengths: [],
    commonPatterns: {},
    dateRange: { first: null, last: null },
  };

  for (const line of lines) {
    let entry;
    try {
      entry = JSON.parse(line);
    } catch {
      continue;
    }

    const project = entry.project || entry.cwd || "unknown";
    const shortProject = basename(project);
    stats.promptsByProject[shortProject] = (stats.promptsByProject[shortProject] || 0) + 1;

    const ts =
      typeof entry.timestamp === "string"
        ? entry.timestamp
        : typeof entry.timestamp === "number"
          ? new Date(entry.timestamp).toISOString()
          : null;
    if (ts) {
      const month = ts.slice(0, 7);
      stats.promptsByMonth[month] = (stats.promptsByMonth[month] || 0) + 1;
      if (!stats.dateRange.first || ts < stats.dateRange.first) stats.dateRange.first = ts;
      if (!stats.dateRange.last || ts > stats.dateRange.last) stats.dateRange.last = ts;
    }

    const prompt = entry.display || entry.prompt || entry.message || "";
    if (prompt) stats.promptLengths.push(prompt.length);

    const actionMatch = prompt
      .toLowerCase()
      .match(
        /^(fix|add|create|update|implement|refactor|debug|test|deploy|review|check|build|remove|change|move|set up|configure|explain|help|look|find|search)/,
      );
    if (actionMatch) {
      const action = actionMatch[1];
      stats.commonPatterns[action] = (stats.commonPatterns[action] || 0) + 1;
    }
  }

  const lengths = stats.promptLengths;
  stats.avgPromptLength =
    lengths.length > 0 ? Math.round(lengths.reduce((a, b) => a + b, 0) / lengths.length) : 0;
  stats.medianPromptLength =
    lengths.length > 0 ? lengths.sort((a, b) => a - b)[Math.floor(lengths.length / 2)] : 0;
  delete stats.promptLengths;

  stats.topActions = Object.entries(stats.commonPatterns).sort((a, b) => b[1] - a[1]).slice(0, 15);
  delete stats.commonPatterns;

  stats.topProjects = Object.entries(stats.promptsByProject).sort((a, b) => b[1] - a[1]).slice(0, 20);

  return stats;
}

/** Session memory summaries + theme frequencies. */
function extractSessionMemories() {
  if (!existsSync(MEMORIES_DIR)) return null;

  const files = readdirSync(MEMORIES_DIR).filter((f) => f.endsWith(".json"));
  if (files.length === 0) return null;

  const sessions = [];
  const themes = {};

  for (const file of files) {
    try {
      const data = JSON.parse(readFileSync(join(MEMORIES_DIR, file), "utf-8"));
      const session = {
        id: file.replace(".json", "").slice(0, 8),
        startedAt: data.startedAt,
        compactions: data.compactionCount || 0,
        direction: data.overallDirection || "",
        project: data.projectContext || "",
        keyPoints:
          data.keyPoints ||
          (data.milestones || []).map((m) => (typeof m === "string" ? m : m?.t)).filter(Boolean),
      };
      sessions.push(session);

      const text = [session.direction, ...session.keyPoints].join(" ").toLowerCase();
      for (const keyword of [
        "fix",
        "bug",
        "deploy",
        "refactor",
        "test",
        "security",
        "performance",
        "ui",
        "api",
        "database",
        "auth",
        "config",
        "migration",
        "debug",
        "review",
        "design",
      ]) {
        if (text.includes(keyword)) themes[keyword] = (themes[keyword] || 0) + 1;
      }
    } catch {
      /* skip malformed */
    }
  }

  sessions.sort((a, b) => (a.startedAt || "").localeCompare(b.startedAt || ""));

  return {
    totalSessions: sessions.length,
    dateRange: {
      first: sessions[0]?.startedAt,
      last: sessions[sessions.length - 1]?.startedAt,
    },
    avgCompactions:
      sessions.length > 0
        ? Math.round((sessions.reduce((s, x) => s + x.compactions, 0) / sessions.length) * 10) / 10
        : 0,
    topThemes: Object.entries(themes).sort((a, b) => b[1] - a[1]).slice(0, 15),
    sessions: sessions.slice(-30),
  };
}

/** File-edit patterns: most-edited, cross-session hotspots, type distribution. */
function extractFileEditPatterns() {
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
  const sessionCounts = {};

  for (const [path, data] of files) {
    if (data.sessions) {
      const sessCount = Object.keys(data.sessions).length;
      if (sessCount > 1) sessionCounts[path] = sessCount;
    }
  }

  const shorten = (p) => (HOME ? p.split(HOME).join("~") : p);

  const mostEdited = files
    .sort((a, b) => (b[1].editCount || 0) - (a[1].editCount || 0))
    .slice(0, 25)
    .map(([path, data]) => ({
      path: shorten(path),
      edits: data.editCount,
      sessions: data.sessions ? Object.keys(data.sessions).length : 0,
      firstEdit: data.firstEdit,
      lastEdit: data.lastEdit,
    }));

  const hotspots = Object.entries(sessionCounts)
    .filter(([, count]) => count >= 3)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 15)
    .map(([path, count]) => ({
      path: shorten(path),
      sessions: count,
      edits: db.files[path].editCount,
    }));

  const extCounts = {};
  for (const [path] of files) {
    const ext = path.match(/\.\w+$/)?.[0] || "other";
    extCounts[ext] = (extCounts[ext] || 0) + 1;
  }

  return {
    totalFiles: files.length,
    totalEdits,
    mostEdited,
    hotspots,
    fileTypes: Object.entries(extCounts).sort((a, b) => b[1] - a[1]).slice(0, 15),
  };
}

/** Tool usage / error / command frequencies from the rolling logs. */
function extractToolPatterns() {
  if (!existsSync(LOGS_DIR)) return null;

  const logFiles = readdirSync(LOGS_DIR).filter((f) => f.endsWith(".jsonl"));
  if (logFiles.length === 0) return null;

  const toolCounts = {};
  const toolErrors = {};
  const commonCommands = {};
  let totalOps = 0;

  for (const file of logFiles) {
    try {
      const content = readFileSync(join(LOGS_DIR, file), "utf-8").trim();
      for (const line of content.split("\n")) {
        try {
          const entry = JSON.parse(line);
          totalOps++;

          const tool = entry.tool_name || entry.metadata?.tool || "unknown";
          toolCounts[tool] = (toolCounts[tool] || 0) + 1;

          if (tool === "Bash" && entry.metadata?.command) {
            const cmd = entry.metadata.command.split(/\s+/)[0];
            commonCommands[cmd] = (commonCommands[cmd] || 0) + 1;
          }

          if (entry.output_summary && /error|Error|ENOENT|EACCES|failed/i.test(entry.output_summary)) {
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
    sessionsLogged: logFiles.length,
    toolUsage: Object.entries(toolCounts).sort((a, b) => b[1] - a[1]),
    toolErrors: Object.entries(toolErrors).sort((a, b) => b[1] - a[1]).slice(0, 10),
    topBashCommands: Object.entries(commonCommands).sort((a, b) => b[1] - a[1]).slice(0, 15),
  };
}

/** Project knowledge from Claude Code's per-project memory files (if any). */
function extractProjectKnowledge() {
  const projectsDir = join(CLAUDE_HOME, "projects");
  if (!existsSync(projectsDir)) return null;

  const projects = [];

  function walkProjects(dir, depth = 0) {
    if (depth > 5) return;
    try {
      const entries = readdirSync(dir, { withFileTypes: true });
      for (const entry of entries) {
        if (!entry.isDirectory()) continue;
        const memoryDir = join(dir, entry.name, "memory");
        if (existsSync(memoryDir)) {
          const memFiles = readdirSync(memoryDir).filter((f) => f.endsWith(".md") && f !== "MEMORY.md");
          if (memFiles.length > 0) {
            const memoryIndex = join(memoryDir, "MEMORY.md");
            let indexContent = "";
            if (existsSync(memoryIndex)) indexContent = readFileSync(memoryIndex, "utf-8").trim();
            projects.push({
              path: join(dir, entry.name).replace(projectsDir + "/", ""),
              memoryFiles: memFiles.length,
              index: indexContent.slice(0, 500),
            });
          }
        }
        walkProjects(join(dir, entry.name), depth + 1);
      }
    } catch {
      /* skip inaccessible */
    }
  }

  walkProjects(projectsDir);

  return {
    totalProjects: projects.length,
    projects: projects.sort((a, b) => b.memoryFiles - a.memoryFiles),
  };
}

/** Daily activity stats from the stats cache (if present). */
function extractActivityStats() {
  const statsPath = join(CLAUDE_HOME, "stats-cache.json");
  if (!existsSync(statsPath)) return null;
  try {
    return JSON.parse(readFileSync(statsPath, "utf-8"));
  } catch {
    return null;
  }
}

// ─── Stage 2: Aggregation ────────────────────────────────────────────

function aggregateAllData() {
  return {
    extractedAt: new Date().toISOString(),
    prompts: extractPromptPatterns(),
    sessions: extractSessionMemories(),
    edits: extractFileEditPatterns(),
    tools: extractToolPatterns(),
    projects: extractProjectKnowledge(),
    activity: extractActivityStats(),
  };
}

// ─── Stage 3: LLM Synthesis ──────────────────────────────────────────

// Per-section caps + a final char cap keep the prompt under any provider's
// context limit even with years of history: each MAX_* slices a section to its
// most-significant rows, and if the assembled prompt still exceeds
// MAX_PROMPT_CHARS we keep the head + tail and drop the middle (see the
// truncation at the end of buildSynthesisPrompt) so the framing and the task
// instructions always survive.
const MAX_PROMPT_CHARS = 600_000;
const MAX_HOTSPOTS = 30;
const MAX_TOOL_ROWS = 25;
const MAX_BASH_COMMANDS = 25;
const MAX_PROJECTS = 40;

function buildSynthesisPrompt(data) {
  let prompt = `You are analyzing the complete Claude Code history of one user across ${data.prompts?.totalPrompts || "?"} prompts, ${data.sessions?.totalSessions || "?"} summarized sessions, ${data.edits?.totalEdits || "?"} file edits, and ${data.tools?.totalOperations || "?"} tool operations spanning ${data.prompts?.dateRange?.first?.slice(0, 10) || "?"} to ${data.prompts?.dateRange?.last?.slice(0, 10) || "?"}.

Your goal: extract META-LEARNINGS that span across projects, time, and tech stacks. This is not about individual sessions — it's about patterns in how this user works with Claude Code.

## Prompt History Analysis

`;

  if (data.prompts) {
    prompt += `**${data.prompts.totalPrompts} total prompts** | Avg length: ${data.prompts.avgPromptLength} chars | Median: ${data.prompts.medianPromptLength} chars

Top projects by prompt count:
${data.prompts.topProjects.slice(0, 15).map(([p, c]) => `  ${p}: ${c}`).join("\n")}

Top action verbs:
${data.prompts.topActions.map(([a, c]) => `  ${a}: ${c}`).join("\n")}

Monthly activity:
${Object.entries(data.prompts.promptsByMonth).sort().map(([m, c]) => `  ${m}: ${c}`).join("\n")}

`;
  }

  prompt += `## Session Summaries (${data.sessions?.totalSessions || 0} sessions)\n\n`;
  if (data.sessions) {
    prompt += `Avg compactions per session: ${data.sessions.avgCompactions}
Top themes: ${data.sessions.topThemes.map(([t, c]) => `${t}(${c})`).join(", ")}

Recent sessions:
${data.sessions.sessions
  .slice(-20)
  .map(
    (s) =>
      `  [${s.startedAt?.slice(0, 10) || "?"}] ${s.project || "unknown"}: ${s.direction || s.keyPoints.join("; ") || "(no summary)"}`,
  )
  .join("\n")}

`;
  }

  prompt += `## File Edit Patterns (${data.edits?.totalEdits || 0} edits across ${data.edits?.totalFiles || 0} files)\n\n`;
  if (data.edits) {
    prompt += `Cross-session hotspots (files edited in 3+ sessions — high churn):
${data.edits.hotspots.slice(0, MAX_HOTSPOTS).map((h) => `  ${h.path}: ${h.edits} edits in ${h.sessions} sessions`).join("\n")}

Most edited files:
${data.edits.mostEdited.slice(0, 15).map((f) => `  ${f.path}: ${f.edits} edits`).join("\n")}

File type distribution:
${data.edits.fileTypes.slice(0, 10).map(([ext, c]) => `  ${ext}: ${c}`).join("\n")}

`;
  }

  prompt += `## Tool Usage (${data.tools?.totalOperations || 0} operations across ${data.tools?.sessionsLogged || 0} sessions)\n\n`;
  if (data.tools) {
    prompt += `Tool frequency:
${data.tools.toolUsage.slice(0, MAX_TOOL_ROWS).map(([t, c]) => `  ${t}: ${c}`).join("\n")}

Tool errors:
${data.tools.toolErrors.slice(0, MAX_TOOL_ROWS).map(([t, c]) => `  ${t}: ${c} errors`).join("\n")}

Top Bash commands:
${data.tools.topBashCommands.slice(0, MAX_BASH_COMMANDS).map(([cmd, c]) => `  ${cmd}: ${c}`).join("\n")}

`;
  }

  prompt += `## Project Portfolio (${data.projects?.totalProjects || 0} projects with memory)\n\n`;
  if (data.projects) {
    prompt +=
      data.projects.projects
        .slice(0, MAX_PROJECTS)
        .map(
          (p) =>
            `  ${p.path} (${p.memoryFiles} memory files)${p.index ? "\n    " + p.index.split("\n").slice(0, 3).join("\n    ") : ""}`,
        )
        .join("\n") + "\n\n";
  }

  prompt += `## Analysis Task

Based on ALL of the above data, produce a comprehensive retrospective. Respond with valid JSON:

{
  "meta_learnings": [
    {
      "title": "Short descriptive title",
      "insight": "The meta-learning in 2-3 sentences",
      "evidence": "What data supports this (cite specific numbers)",
      "actionable": "Specific change to make in CLAUDE.md, hooks, or workflow",
      "confidence": "high|medium|low"
    }
  ],
  "working_patterns": {
    "strengths": ["What this user does well with Claude Code"],
    "inefficiencies": ["Patterns that waste time or tokens"],
    "blind_spots": ["Areas they might not realize could improve"]
  },
  "project_insights": {
    "most_active": "Which project(s) dominate usage and what that means",
    "cross_project_patterns": ["Patterns that repeat across different projects"],
    "tech_stack_preferences": "Observed preferences in languages, tools, frameworks"
  },
  "harness_recommendations": [
    {
      "target": "CLAUDE.md | config.json | hook module | command | workflow",
      "change": "Specific recommendation",
      "rationale": "Why, based on observed patterns",
      "priority": "high|medium|low"
    }
  ],
  "efficiency_report": {
    "estimated_sessions": ${data.sessions?.totalSessions || "?"},
    "overall_health": "1-10 rating",
    "trend": "improving|stable|declining",
    "biggest_opportunity": "Single most impactful improvement"
  }
}

IMPORTANT:
- Be specific and data-driven — cite actual numbers from the data above
- Focus on NON-OBVIOUS insights (don't just restate the data)
- Prioritize actionable recommendations over observations
- Consider the full arc: how has this user's workflow evolved over time?
- Look for anti-patterns: files edited too many times (churn), tools with high error rates, etc.`;

  // Final safety net: truncate the middle if still too large.
  if (prompt.length > MAX_PROMPT_CHARS) {
    const head = prompt.slice(0, MAX_PROMPT_CHARS - 2_000);
    const tail = prompt.slice(-1_500);
    prompt = `${head}\n\n[... truncated ${prompt.length - MAX_PROMPT_CHARS} chars from middle ...]\n\n${tail}`;
  }

  return prompt;
}

async function synthesize(aggregated, config) {
  const apiKey = getApiKey();
  if (!apiKey) throw new Error("No API key available");

  const roleConfig = config.llm?.recall;
  if (!roleConfig) throw new Error("No recall LLM configured");

  const prompt = buildSynthesisPrompt(aggregated);
  return await callLlm(apiKey, roleConfig, prompt, { timeoutMs: 60_000, format: "json" });
}

// ─── Stage 4: Report Generation ──────────────────────────────────────

function formatReport(result, aggregated) {
  const now = new Date().toISOString().split("T")[0];

  let md = `# Deep Retrospective Report
> Generated: ${now}
> Prompts analyzed: ${aggregated.prompts?.totalPrompts || "?"}
> Sessions: ${aggregated.sessions?.totalSessions || "?"}
> File edits: ${aggregated.edits?.totalEdits || "?"}
> Tool operations: ${aggregated.tools?.totalOperations || "?"}
> Time span: ${aggregated.prompts?.dateRange?.first?.slice(0, 10) || "?"} to ${aggregated.prompts?.dateRange?.last?.slice(0, 10) || "?"}

---

## Efficiency Report
- **Overall Health**: ${result.efficiency_report?.overall_health || "?"}/10
- **Trend**: ${result.efficiency_report?.trend || "unknown"}
- **Biggest Opportunity**: ${result.efficiency_report?.biggest_opportunity || "N/A"}

---

## Meta-Learnings

`;

  if (result.meta_learnings) {
    for (const ml of result.meta_learnings) {
      md += `### ${ml.title}
**Insight**: ${ml.insight}
**Evidence**: ${ml.evidence}
**Action**: ${ml.actionable}
**Confidence**: ${ml.confidence}

`;
    }
  }

  md += `---

## Working Patterns

### Strengths
${(result.working_patterns?.strengths || []).map((s) => `- ${s}`).join("\n")}

### Inefficiencies
${(result.working_patterns?.inefficiencies || []).map((s) => `- ${s}`).join("\n")}

### Blind Spots
${(result.working_patterns?.blind_spots || []).map((s) => `- ${s}`).join("\n")}

---

## Project Insights
- **Most Active**: ${result.project_insights?.most_active || "N/A"}
- **Tech Stack Preferences**: ${result.project_insights?.tech_stack_preferences || "N/A"}

### Cross-Project Patterns
${(result.project_insights?.cross_project_patterns || []).map((p) => `- ${p}`).join("\n")}

---

## Harness Recommendations

`;

  if (result.harness_recommendations) {
    for (const rec of result.harness_recommendations) {
      md += `### [${rec.priority?.toUpperCase() || "?"}] ${rec.change}
- **Target**: ${rec.target}
- **Rationale**: ${rec.rationale}

`;
    }
  }

  md += `---

## Raw Data Summary

### Prompt Patterns
- Total prompts: ${aggregated.prompts?.totalPrompts || "?"}
- Avg length: ${aggregated.prompts?.avgPromptLength || "?"} chars
- Top projects: ${(aggregated.prompts?.topProjects || []).slice(0, 5).map(([p, c]) => `${p}(${c})`).join(", ")}
- Top actions: ${(aggregated.prompts?.topActions || []).slice(0, 5).map(([a, c]) => `${a}(${c})`).join(", ")}

### File Edit Hotspots
${(aggregated.edits?.hotspots || []).slice(0, 10).map((h) => `- ${h.path}: ${h.edits} edits / ${h.sessions} sessions`).join("\n")}

### Tool Usage
${(aggregated.tools?.toolUsage || []).slice(0, 10).map(([t, c]) => `- ${t}: ${c}`).join("\n")}
`;

  return md;
}

// ─── Main Entry Point ────────────────────────────────────────────────

export async function retrospective(config) {
  if (!existsSync(RETRO_DIR)) mkdirSync(RETRO_DIR, { recursive: true });

  const aggregated = aggregateAllData();

  const hasData =
    (aggregated.prompts?.totalPrompts || 0) > 0 || (aggregated.sessions?.totalSessions || 0) > 0;
  if (!hasData) {
    return {
      success: false,
      message: "No conversation data found. Use Claude Code for a while first.",
      reportPath: null,
    };
  }

  let result;
  try {
    result = await synthesize(aggregated, config);
  } catch (err) {
    // If the LLM fails, still save the raw aggregation so nothing is lost.
    const rawPath = join(RETRO_DIR, `retrospective-raw-${new Date().toISOString().split("T")[0]}.json`);
    writeFileSync(rawPath, JSON.stringify(aggregated, null, 2));
    return {
      success: false,
      message: `LLM synthesis failed (${err.message}), but raw data saved to ${rawPath}`,
      reportPath: rawPath,
      aggregated,
    };
  }

  if (!result) {
    return {
      success: false,
      message: "LLM returned no analysis.",
      reportPath: null,
      aggregated,
    };
  }

  const dateStr = new Date().toISOString().split("T")[0];
  const reportPath = join(RETRO_DIR, `retrospective-${dateStr}.md`);
  writeFileSync(reportPath, formatReport(result, aggregated));

  const rawPath = join(RETRO_DIR, `retrospective-raw-${dateStr}.json`);
  writeFileSync(rawPath, JSON.stringify({ aggregated, synthesis: result }, null, 2));

  const historyEntry = {
    timestamp: new Date().toISOString(),
    promptsAnalyzed: aggregated.prompts?.totalPrompts || 0,
    sessionsAnalyzed: aggregated.sessions?.totalSessions || 0,
    editsAnalyzed: aggregated.edits?.totalEdits || 0,
    metaLearnings: result.meta_learnings?.length || 0,
    recommendations: result.harness_recommendations?.length || 0,
    healthScore: result.efficiency_report?.overall_health || null,
  };
  appendFileSync(RETRO_HISTORY, JSON.stringify(historyEntry) + "\n");

  return {
    success: true,
    message: `Deep retrospective complete. ${result.meta_learnings?.length || 0} meta-learnings, ${result.harness_recommendations?.length || 0} recommendations.`,
    reportPath,
    rawDataPath: rawPath,
    health: result.efficiency_report,
    learningCount: result.meta_learnings?.length || 0,
    recommendationCount: result.harness_recommendations?.length || 0,
  };
}
