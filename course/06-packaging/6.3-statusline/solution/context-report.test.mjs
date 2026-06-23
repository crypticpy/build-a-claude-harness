// context-report.test.mjs — prove the warning fires exactly ONCE per session.
//
// Runs reportContext twice with a near-full transcript: the first call must
// return a warning string, the second must return null (the per-session marker
// suppresses it). Also checks that a below-threshold context stays silent.
//
// Run: node context-report.test.mjs   (exits 0 on success, 1 on failure)

import { mkdtempSync, mkdirSync, copyFileSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const FIX = join(HERE, "..", "fixtures");

// Pin the window so the threshold is deterministic regardless of the shell's
// ambient CLAUDE_CODE_AUTO_COMPACT_WINDOW. 200000 → compactAt 160000, warnAt
// 144000; the fixture's 153.5K context sits comfortably past it.
process.env.CLAUDE_CODE_AUTO_COMPACT_WINDOW = "200000";

// Throwaway copy of the module so its marker dir (memories/) lands in a temp dir.
const work = mkdtempSync(join(tmpdir(), "ctxreport-test-"));
copyFileSync(join(HERE, "context-report.mjs"), join(work, "context-report.mjs"));
const transcript = join(work, "near-full-transcript.jsonl");
copyFileSync(join(FIX, "near-full-transcript.jsonl"), transcript);

const { reportContext } = await import(join(work, "context-report.mjs"));

function assert(cond, msg) {
  if (!cond) {
    console.error("FAIL:", msg);
    rmSync(work, { recursive: true, force: true });
    process.exit(1);
  }
  console.log("ok  -", msg);
}

// 1. First call at ~96% context → a warning.
const first = await reportContext({ session_id: "sess-A", transcript_path: transcript });
assert(typeof first === "string" && /Context at \d+%/.test(first), "first call past 90% emits a warning");

// 2. Second call, same session → silent (marker already written).
const second = await reportContext({ session_id: "sess-A", transcript_path: transcript });
assert(second === null, "second call in the same session is silent (exactly one warning)");

// 3. A different session that is well below threshold → silent.
const lowTranscript = join(work, "low.jsonl");
writeFileSync(
  lowTranscript,
  JSON.stringify({ type: "assistant", message: { usage: { input_tokens: 5000, output_tokens: 500 } } }) + "\n",
);
const low = await reportContext({ session_id: "sess-B", transcript_path: lowTranscript });
assert(low === null, "a below-threshold session never warns");

rmSync(work, { recursive: true, force: true });
console.log("\nAll checks passed: near-full context emits exactly ONE warning.");
