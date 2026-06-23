// evolve.test.mjs — verify /evolve offline, with NO network and NO real key.
//
// We stub global.fetch so callLlm() gets a canned Responses-API reply, point
// the module at the fixture lessons, run evolve(), and assert two things:
//   1. a proposals file is written (the human-review artifact), and
//   2. NOTHING was auto-applied — there is no config/CLAUDE.md mutation; the
//      only write is the proposals + history file in evolution/.
//
// Run: node evolve.test.mjs   (exits 0 on success, 1 on failure)

import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, existsSync, copyFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));

// ── 1. Stub the network. callLlm() will hit this fake instead of the API. ──
const CANNED_PROPOSALS = {
  summary: "Recurring test-runner guessing and missing impact checks dominate.",
  proposals: [
    {
      id: "prop-1",
      title: "Discover the test command before running it",
      target: "CLAUDE.md",
      change: "Add: read package.json scripts to find the test runner before invoking it.",
      rationale: "Wrong-runner guesses appeared in 3 of 5 sessions.",
      confidence: "high",
    },
    {
      id: "prop-2",
      title: "Impact-check before editing shared exports",
      target: "CLAUDE.md",
      change: "Add: run impact_check before changing a function/type other files import.",
      rationale: "Broke downstream consumers in multiple sessions.",
      confidence: "high",
    },
  ],
};

global.fetch = async () => ({
  ok: true,
  json: async () => ({ output_text: JSON.stringify(CANNED_PROPOSALS) }),
});

// A fake key so getApiKey() returns non-null and callLlm proceeds to fetch.
process.env.LLM_API_KEY = "test-key-not-real";

// ── 2. Build a throwaway module dir so we don't write into the repo. ──
const work = mkdtempSync(join(tmpdir(), "evolve-test-"));
for (const f of ["self-evolution.mjs", "llm-call.mjs", "api-key.mjs", "config.json"]) {
  copyFileSync(join(HERE, f), join(work, f));
}
mkdirSync(join(work, "context-layer"), { recursive: true });
copyFileSync(join(HERE, "..", "fixtures", "lessons.jsonl"), join(work, "context-layer", "lessons.jsonl"));

// Snapshot CLAUDE.md + config.json so we can prove evolve() never edits them.
const configBefore = readFileSync(join(work, "config.json"), "utf-8");
const claudeMd = join(work, "CLAUDE.md");
writeFileSync(claudeMd, "# fake CLAUDE.md\n");
const claudeMdBefore = readFileSync(claudeMd, "utf-8");

// ── 3. Run evolve() from the throwaway dir. ──
const { evolve } = await import(join(work, "self-evolution.mjs"));
const config = JSON.parse(readFileSync(join(work, "config.json"), "utf-8"));
const result = await evolve(config);

// ── 4. Assertions. ──
function assert(cond, msg) {
  if (!cond) {
    console.error("FAIL:", msg);
    rmSync(work, { recursive: true, force: true });
    process.exit(1);
  }
  console.log("ok  -", msg);
}

assert(result.success === true, "evolve() reports success on the fixture");
const proposalsPath = join(work, "evolution", "proposals.md");
assert(existsSync(proposalsPath), "proposals.md is written for human review");

const proposalsText = readFileSync(proposalsPath, "utf-8");
assert(/prop-1/.test(proposalsText), "proposals.md contains the synthesized proposal");
assert(/\[ \] Pending review/.test(proposalsText), "every proposal is left Pending review (not auto-applied)");

assert(existsSync(join(work, "evolution", "history.jsonl")), "a history line is appended");

// The human-in-the-loop guarantee: nothing the model proposed was written back
// into config.json or CLAUDE.md. The harness was NOT mutated.
assert(readFileSync(join(work, "config.json"), "utf-8") === configBefore, "config.json was NOT auto-edited");
assert(readFileSync(claudeMd, "utf-8") === claudeMdBefore, "CLAUDE.md was NOT auto-edited");

rmSync(work, { recursive: true, force: true });
console.log("\nAll checks passed: proposals emitted, nothing auto-applied.");
