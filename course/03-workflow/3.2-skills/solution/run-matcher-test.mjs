// run-matcher-test.mjs — drives match-skill.mjs against fixtures/match-cases.json.
//
// This is the deterministic checkpoint for 3.2. It proves the HOOK activation
// path works: the changelog skill's rule matches the test phrases it should,
// and stays quiet on the excluded ones — with no model in the loop.
//
// It also proves the decoy is correctly skipped: matchPrompt only returns a
// skill name when loadRules() found the canonical rules. If the decoy stub were
// being loaded instead, no skill would match and every positive case would fail.
//
// Usage:  node run-matcher-test.mjs            (reads ../fixtures/match-cases.json)
//         node run-matcher-test.mjs <path>     (custom cases file)

import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { loadRules, matchPrompt } from "./match-skill.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const casesPath = process.argv[2] || join(HERE, "..", "fixtures", "match-cases.json");

const { cases } = JSON.parse(readFileSync(casesPath, "utf-8"));
const rules = loadRules();

if (!rules) {
  console.error("FAIL: no rules loaded — is hooks/unified/skill-rules.json present?");
  process.exit(1);
}

let failures = 0;
for (const c of cases) {
  const got = matchPrompt(c.prompt, rules);
  const ok = got === c.expect;
  if (!ok) failures++;
  const mark = ok ? "PASS" : "FAIL";
  console.log(`${mark}  expect=${JSON.stringify(c.expect)} got=${JSON.stringify(got)}  "${c.prompt}"`);
}

console.log(`\n${cases.length - failures}/${cases.length} cases passed.`);
process.exit(failures === 0 ? 0 : 1);
