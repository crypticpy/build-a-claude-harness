// match-skill.mjs — the hook-driven activation path, deterministic and LLM-free.
//
// Two ways a skill gets activated:
//   1. MODEL path — Claude reads every skill's `description` and decides on its
//      own whether to invoke it. That's the SKILL.md you wrote. No code here.
//   2. HOOK path — on UserPromptSubmit, the harness matches your prompt against
//      skill-rules.json and SUGGESTS a skill. That's this file: pure regex/string
//      matching, so it's testable with no model in the loop.
//
// This is a simplified `checkSkills` from
// reference/hooks/unified/modules/skill-activation.mjs. The load order is the
// load-bearing part: a project-level rules file wins UNLESS it's a redirect stub,
// in which case we fall through to the canonical file. That redirect check is
// what defuses the decoy at skills/skill-rules.json.
//
// Usage:
//   node match-skill.mjs "please add a changelog entry for the retry fix"
//   -> prints the matched skill name (exit 0) or "(no match)" (exit 1)

import { readFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const CANONICAL_RULES = join(HERE, "hooks", "unified", "skill-rules.json");
const PROJECT_RULES = join(HERE, "skills", "skill-rules.json"); // the DECOY location

/**
 * Load the active rules. A project-level file wins ONLY if it has a `skills`
 * map and is not a redirect stub; otherwise use the canonical file. Returns the
 * parsed rules object, or null if none usable.
 */
export function loadRules() {
  if (existsSync(PROJECT_RULES)) {
    const parsed = JSON.parse(readFileSync(PROJECT_RULES, "utf-8"));
    // The decoy sets redirect:true and has no skills map → fall through.
    if (parsed?.skills && !parsed.redirect) return parsed;
  }
  if (existsSync(CANONICAL_RULES)) {
    const parsed = JSON.parse(readFileSync(CANONICAL_RULES, "utf-8"));
    if (parsed?.skills) return parsed;
  }
  return null;
}

/**
 * Does this skill's triggers match the prompt? Order mirrors the reference:
 *   exclude patterns short-circuit to false, then keywords, then intentPatterns.
 */
export function skillMatches(skillConfig, promptLower) {
  const t = skillConfig.promptTriggers;
  if (!t) return false;
  if (t.excludePatterns?.some((p) => new RegExp(p, "i").test(promptLower))) return false;
  if (t.keywords?.some((kw) => promptLower.includes(kw.toLowerCase()))) return true;
  if (t.intentPatterns?.some((p) => new RegExp(p, "i").test(promptLower))) return true;
  return false;
}

/** Return the name of the first skill whose triggers match, or null. */
export function matchPrompt(prompt, rules) {
  if (!rules?.skills) return null;
  const promptLower = prompt.toLowerCase();
  for (const [name, config] of Object.entries(rules.skills)) {
    if (skillMatches(config, promptLower)) return name;
  }
  return null;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const prompt = process.argv.slice(2).join(" ");
  const rules = loadRules();
  const matched = matchPrompt(prompt, rules);
  if (matched) {
    console.log(matched);
    process.exit(0);
  } else {
    console.log("(no match)");
    process.exit(1);
  }
}
