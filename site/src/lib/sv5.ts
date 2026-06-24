// SV-5 Per-Repo Intelligence & Memory Stack. The central economic truth: per-repo
// intelligence is four cheap layers, and only one of them (the brain, at compaction)
// ever pays the LLM. The learner should leave able to answer "where does the money
// go?" with one finger on the diagram. Build-time only; the cylinder accretes and
// the brain lights via the shared TracePlayer decorator (one integer step cursor).
import type { StepView } from "../islands/TracePlayer";
import { SHORT_SHA } from "./repo";

export interface Tier {
  id: string;
  title: string;
  module: string;
  cost: string;
  when: string;
  billed: boolean;
}

// Four tiers, three free, one billed. The free tiers are plain string ops and file
// appends; the brain is the only LLM call, off the hot path at PreCompact.
export const tiers: Tier[] = [
  {
    id: "index",
    title: "static index",
    module: "session-start.mjs",
    cost: "0 tokens",
    when: "once at SessionStart",
    billed: false,
  },
  {
    id: "log",
    title: "rolling log",
    module: "rolling-log.mjs",
    cost: "0 tokens",
    when: "every tool call",
    billed: false,
  },
  {
    id: "query",
    title: "distilled query",
    module: "string truncation",
    cost: "0 tokens",
    when: "on read",
    billed: false,
  },
  {
    id: "brain",
    title: "cross-session brain",
    module: "precompact-llm.mjs",
    cost: "~8000 tokens",
    when: "ONCE on PreCompact",
    billed: true,
  },
];

// Seven real tool-call records in the rolling-log.mjs logEntry shape
// ({ timestamp, tool_name, tool_input, output_summary, metadata }), abbreviated.
export interface LogRecord {
  tool_name: string;
  tool_input: string;
  output_summary: string;
}
export const toolCalls: LogRecord[] = [
  {
    tool_name: "Read",
    tool_input: "rolling-log.mjs",
    output_summary: "read 280 lines",
  },
  {
    tool_name: "Edit",
    tool_input: "format-lint.mjs",
    output_summary: "applied 1 edit",
  },
  { tool_name: "Bash", tool_input: "npm run verify", output_summary: "exit 0" },
  { tool_name: "Write", tool_input: "sv5.ts", output_summary: "created file" },
  { tool_name: "Grep", tool_input: "logEntry", output_summary: "3 matches" },
  {
    tool_name: "Edit",
    tool_input: "rolling-log.mjs",
    output_summary: "applied 1 edit",
  },
  { tool_name: "Bash", tool_input: "git commit", output_summary: "exit 0" },
];

// The brain note the summarizer distills (derived at build, course-taught).
export const brainSignals = [
  "hot-file: rolling-log.mjs (2 edits)",
  "verified: npm run verify green",
  "pattern: edit-then-log",
];
export const brainOutputs = ["memories/<id>.json", "lessons.jsonl"];

// ── Geometry, shared with the static SVG. ────────────────────────────────────
export const W = 900;
export const H = 600;
export const PILL_X = 150;
export const PILL_W = 150;
export const PILL_H = 22;
export const pillY = (i: number) => 138 + i * 27;
export const CYL_X = 540;
export const CYL_TOP = 150;
export const CYL_BOT = 312;
export const CYL_RX = 66;
export const BRAIN_X = 540;
export const BRAIN_Y = 486;
export const diskLineY = (i: number) => CYL_BOT - 16 - i * 18; // bottom-up accretion

export const SHA = SHORT_SHA;

export function buildSv5(): { steps: StepView[] } {
  const steps: StepView[] = toolCalls.map((t, i) => ({
    litNodes: [`pill-${i}`],
    litEdges: [],
    tokenPath: `M${PILL_X + PILL_W},${pillY(i) + PILL_H / 2} L${CYL_X - CYL_RX + 8},${CYL_TOP + 24}`,
    diskLines: i + 1,
    drawer: `pill-${i}`,
    narration: `${t.tool_name} appended one record. 0 tokens, append-only, fail-silent.`,
  }));
  // The held-breath climax: the scanner sweeps the whole log, then the one billed
  // tier lights. One finger, and the money lights up in exactly one place.
  steps.push({
    litNodes: ["brain"],
    litEdges: ["scan"],
    tokenPath: `M${CYL_X},${CYL_BOT} L${BRAIN_X},${BRAIN_Y - 46}`,
    diskLines: 7,
    drawer: "brain",
    narration:
      "PreCompact reads the whole log at once and distills it into a cross-session note. About 8000 tokens, once. This is the only place the money goes.",
  });
  return { steps };
}
