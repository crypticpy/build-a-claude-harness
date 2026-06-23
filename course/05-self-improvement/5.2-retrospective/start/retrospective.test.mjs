// retrospective.test.mjs — verify /retrospective offline, no network, no key.
//
// Stubs global.fetch with a canned reply, points the module at the fixture
// memories/logs, runs retrospective(), and asserts a REPORT FILE is produced
// (the deliverable) and contains the synthesized meta-learning.
//
// Run: node retrospective.test.mjs   (exits 0 on success, 1 on failure)

import { mkdtempSync, mkdirSync, readFileSync, existsSync, copyFileSync, readdirSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const FIX = join(HERE, "..", "fixtures");

const CANNED = {
  meta_learnings: [
    {
      title: "Test-runner mismatch is a recurring time sink",
      insight: "Commands assume jest but the repo uses vitest, causing failed runs and retries.",
      evidence: "A 'command not found: vitest' error appears in the tool logs.",
      confidence: "high",
    },
  ],
  harness_recommendations: [
    { target: "CLAUDE.md", change: "Discover the test runner from package.json before running tests.", priority: "high" },
  ],
  efficiency_report: { overall_health: "7", trend: "stable", biggest_opportunity: "Stop guessing the test runner." },
};

global.fetch = async () => ({ ok: true, json: async () => ({ output_text: JSON.stringify(CANNED) }) });
process.env.LLM_API_KEY = "test-key-not-real";

// Throwaway module dir with the fixtures copied alongside it.
const work = mkdtempSync(join(tmpdir(), "retro-test-"));
for (const f of ["deep-retrospective.mjs", "llm-call.mjs", "api-key.mjs", "config.json"]) {
  copyFileSync(join(HERE, f), join(work, f));
}
mkdirSync(join(work, "memories"), { recursive: true });
mkdirSync(join(work, "logs"), { recursive: true });
for (const f of readdirSync(join(FIX, "memories"))) copyFileSync(join(FIX, "memories", f), join(work, "memories", f));
for (const f of readdirSync(join(FIX, "logs"))) copyFileSync(join(FIX, "logs", f), join(work, "logs", f));

const { retrospective } = await import(join(work, "deep-retrospective.mjs"));
const config = JSON.parse(readFileSync(join(work, "config.json"), "utf-8"));
const result = await retrospective(config);

function assert(cond, msg) {
  if (!cond) {
    console.error("FAIL:", msg);
    rmSync(work, { recursive: true, force: true });
    process.exit(1);
  }
  console.log("ok  -", msg);
}

assert(result.success === true, "retrospective() reports success on the fixtures");
assert(result.reportPath && existsSync(result.reportPath), "a report file is produced");

const report = readFileSync(result.reportPath, "utf-8");
assert(/Deep Retrospective Report/.test(report), "report has the expected heading");
assert(/Test-runner mismatch/.test(report), "report contains the synthesized meta-learning");
assert(/Meta-Learnings/.test(report) && /Harness Recommendations/.test(report), "report has both sections");

rmSync(work, { recursive: true, force: true });
console.log("\nAll checks passed: a retrospective report file was produced.");
