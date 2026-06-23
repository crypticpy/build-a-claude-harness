// match-skill.mjs — the hook-driven activation path, deterministic and LLM-free.
//
// Two ways a skill gets activated:
//   1. MODEL path — Claude reads every skill's `description` and decides on its
//      own whether to invoke it. That's the SKILL.md you wrote. No code here.
//   2. HOOK path — on UserPromptSubmit, the harness matches your prompt against
//      skill-rules.json and SUGGESTS a skill. That's this file: pure regex/string
//      matching, so it's testable with no model in the loop.
//
// Simplified from reference/hooks/unified/modules/skill-activation.mjs. Fill the
// THREE function bodies marked `// TODO`. The load order is load-bearing: a
// project-level rules file wins UNLESS it's a redirect stub (the decoy), in
// which case you fall through to the canonical file.
//
// Usage:
//   node match-skill.mjs "please add a changelog entry for the retry fix"

import { readFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const CANONICAL_RULES = join(HERE, "hooks", "unified", "skill-rules.json");
const PROJECT_RULES = join(HERE, "skills", "skill-rules.json"); // the DECOY location

/**
 * Load the active rules. A project-level file wins ONLY if it has a `skills`
 * map AND is not a redirect stub; otherwise use the canonical file.
 * @returns {object|null}
 */
export function loadRules() {
  if (existsSync(PROJECT_RULES)) {
    const parsed = JSON.parse(readFileSync(PROJECT_RULES, "utf-8"));
    // TODO (blank 1): return `parsed` ONLY if it has a skills map and is NOT a
    // redirect stub. The decoy sets `redirect: true` — if you don't check it,
    // you'll load the decoy and nothing will ever match.
    //   if (parsed?.skills && !parsed.redirect) return parsed;
    /* your one line here */
  }
  if (existsSync(CANONICAL_RULES)) {
    const parsed = JSON.parse(readFileSync(CANONICAL_RULES, "utf-8"));
    if (parsed?.skills) return parsed;
  }
  return null;
}

/**
 * Does this skill's triggers match the prompt? Order mirrors the reference:
 * exclude patterns short-circuit to false, then keywords, then intentPatterns.
 * @returns {boolean}
 */
export function skillMatches(skillConfig, promptLower) {
  const t = skillConfig.promptTriggers;
  if (!t) return false;
  // TODO (blank 2): if any excludePattern matches promptLower, return false.
  //   if (t.excludePatterns?.some((p) => new RegExp(p, "i").test(promptLower))) return false;
  /* your one line here */
  if (t.keywords?.some((kw) => promptLower.includes(kw.toLowerCase()))) return true;
  if (t.intentPatterns?.some((p) => new RegExp(p, "i").test(promptLower))) return true;
  return false;
}

/**
 * Return the name of the first skill whose triggers match, or null.
 * @returns {string|null}
 */
export function matchPrompt(prompt, rules) {
  if (!rules?.skills) return null;
  const promptLower = prompt.toLowerCase();
  // TODO (blank 3): loop over Object.entries(rules.skills); return the first
  // `name` for which skillMatches(config, promptLower) is true. Return null if none.
  /* your loop here */
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
