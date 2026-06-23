/**
 * Skill activation — suggest the right skill at the right moment.
 *
 * On UserPromptSubmit, match the prompt against the triggers in skill-rules.json
 * (keywords, intent regexes, and exclude patterns). When a skill matches, emit a
 * short suggestion block. Each skill is suggested at most once per session — a
 * small state file tracks what's already been recommended.
 *
 * Rules are loaded from the project's own skill-rules.json when present,
 * otherwise from the copy beside this hook. Both the rules and the state file
 * are resolved relative to this module — no absolute paths.
 */

import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const HOOK_ROOT = dirname(__dirname); // modules/ -> hooks/unified/

const STATE_FILE = join(HOOK_ROOT, "skill-state.json");
const CANONICAL_RULES = join(HOOK_ROOT, "skill-rules.json");

export async function checkSkills(event, _config) {
  try {
    const { prompt, session_id } = event;
    if (!prompt || !session_id) return null;

    const promptLower = prompt.toLowerCase();

    // Project-level rules win, unless the file is just a redirect stub.
    const projectDir = process.env.CLAUDE_PROJECT_DIR;
    const projectRulesPath = projectDir
      ? join(projectDir, ".claude", "skills", "skill-rules.json")
      : null;

    let rules = null;
    if (projectRulesPath && existsSync(projectRulesPath)) {
      const parsed = JSON.parse(readFileSync(projectRulesPath, "utf-8"));
      if (parsed?.skills && !parsed.redirect) rules = parsed;
    }
    if (!rules && existsSync(CANONICAL_RULES)) {
      const parsed = JSON.parse(readFileSync(CANONICAL_RULES, "utf-8"));
      if (parsed?.skills) rules = parsed;
    }
    if (!rules) return null;

    // Load + age out state (7-day TTL per session).
    let state = {};
    if (existsSync(STATE_FILE)) {
      try {
        state = JSON.parse(readFileSync(STATE_FILE, "utf-8"));
      } catch {
        state = {};
      }
    }
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    for (const [sid, data] of Object.entries(state)) {
      if (data.lastUpdated && data.lastUpdated < sevenDaysAgo) delete state[sid];
    }

    const alreadyRecommended = state[session_id]?.skills || [];
    const matchedSkills = [];

    for (const [skillName, skillConfig] of Object.entries(rules.skills)) {
      const triggers = skillConfig.promptTriggers;
      if (!triggers) continue;
      if (alreadyRecommended.includes(skillName)) continue;

      if (triggers.excludePatterns?.some((p) => new RegExp(p, "i").test(promptLower))) continue;

      if (triggers.keywords?.some((kw) => promptLower.includes(kw.toLowerCase()))) {
        matchedSkills.push({ name: skillName, config: skillConfig });
        continue;
      }
      if (triggers.intentPatterns?.some((p) => new RegExp(p, "i").test(promptLower))) {
        matchedSkills.push({ name: skillName, config: skillConfig });
      }
    }

    if (matchedSkills.length === 0) return null;

    const groups = {
      critical: matchedSkills.filter((s) => s.config.priority === "critical"),
      high: matchedSkills.filter((s) => s.config.priority === "high"),
      medium: matchedSkills.filter((s) => s.config.priority === "medium"),
      low: matchedSkills.filter((s) => s.config.priority === "low"),
    };

    const formatSkill = (s) => {
      if (s.config.type === "slash-command" && s.config.action) {
        return `  -> ${s.name} — ${s.config.action}\n`;
      }
      return `  -> ${s.name}\n`;
    };

    let output = "SKILL ACTIVATION CHECK\n\n";

    if (groups.critical.length > 0) {
      output += "CRITICAL SKILLS (REQUIRED):\n";
      groups.critical.forEach((s) => (output += formatSkill(s)));
      output += "\n";
    }
    if (groups.high.length > 0) {
      output += "RECOMMENDED SKILLS:\n";
      groups.high.forEach((s) => (output += formatSkill(s)));
      output += "\n";
    }
    if (groups.medium.length > 0) {
      output += "SUGGESTED SKILLS:\n";
      groups.medium.forEach((s) => (output += formatSkill(s)));
      output += "\n";
    }

    const proactive = matchedSkills.filter(
      (s) => s.config.type === "proactive" && s.config.promptTriggers?.proactiveHint,
    );
    if (proactive.length > 0) {
      output += "PROACTIVE HINTS:\n";
      proactive.forEach((s) => {
        output += `  ${s.config.promptTriggers.proactiveHint}\n`;
      });
      output += "\n";
    }

    const skillToolSkills = matchedSkills.filter((s) => s.config.type !== "slash-command");
    const slashCmdSkills = matchedSkills.filter((s) => s.config.type === "slash-command");
    const actions = [];
    if (skillToolSkills.length > 0) actions.push("Use the Skill tool BEFORE responding");
    slashCmdSkills.forEach((s) => {
      if (s.config.action) actions.push(s.config.action);
    });
    output += `ACTION: ${actions.join(" | ")}\n`;

    // Record what we suggested so we don't repeat it this session.
    state[session_id] = {
      skills: [...alreadyRecommended, ...matchedSkills.map((s) => s.name)],
      lastUpdated: new Date().toISOString(),
    };
    try {
      writeFileSync(STATE_FILE, JSON.stringify(state, null, 2));
    } catch {
      /* state write is non-essential */
    }

    return output;
  } catch {
    return null;
  }
}
