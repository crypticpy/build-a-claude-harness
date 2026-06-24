// SV-3 Ecosystem Data-Flow Map — the capstone. The whole machine as one closed
// loop: nine nodes in real lifecycle order, typed edges, the disk as the only
// node that accretes, and a return wire that feeds the next prompt. Build-time
// only; the token rides each edge path (offset-path) at runtime.
import {
  type DiagramModel,
  type DiagramNode,
  type DiagramEdge,
  edgePath,
} from "./diagram";
import { SHORT_SHA } from "./repo";

export interface NodeInfo {
  id: string;
  title: string;
  kind: DiagramNode["kind"];
  tag: string; // provenance / role chip
  payload: string; // the real artifact at this node, in mono
  note: string;
}

export interface Sv3Step {
  litNodes: string[];
  litEdges: string[];
  // Nodes the token has already passed: dimly lit behind the live one so the
  // closed loop reads as accumulating progress, not a single hopping light.
  visited?: string[];
  tokenPath?: string;
  tokenX?: number;
  tokenY?: number;
  diskLines?: number;
  drawer: string;
  narration: string;
}

const W = 1120;
const H = 470;
const SPINE_Y = 150;
const RETURN_Y = 360;

// Nine nodes in lifecycle order. xFrac positions them along the forward spine.
const NODES: Array<NodeInfo & { kind: DiagramNode["kind"]; unsub?: boolean }> =
  [
    {
      id: "SessionStart",
      title: "SessionStart",
      kind: "router",
      tag: `FACT · ${SHORT_SHA}`,
      payload:
        "additionalContext: <project-snapshot> branch main · recent commits …",
      note: "Injects a project snapshot once, at session open.",
    },
    {
      id: "UserPromptSubmit",
      title: "UserPromptSubmit",
      kind: "router",
      tag: `FACT · ${SHORT_SHA}`,
      payload:
        "<session-memory> prior-compaction summary block …</session-memory>",
      note: "Injects the last compaction’s memory before every turn.",
    },
    {
      id: "reason",
      title: "reason",
      kind: "llm",
      tag: "model turn",
      payload: "assistant: I will edit format-lint.mjs, then log the change.",
      note: "The model plans the next tool call. This is the paid thinking.",
    },
    {
      id: "PreToolUse",
      title: "PreToolUse / gate",
      kind: "router",
      tag: "platform event · not subscribed",
      payload: "no row — this harness publishes no PreToolUse hook",
      note: "The gate exists in the platform; this harness wires nothing here.",
    },
    {
      id: "tool",
      title: "tool",
      kind: "tool",
      tag: "Write|Edit",
      payload: "Write format-lint.mjs",
      note: "The tool runs. Its result is what PostToolUse will see.",
    },
    {
      id: "PostToolUse",
      title: "PostToolUse",
      kind: "module",
      tag: `FACT · ${SHORT_SHA} · fan-out`,
      payload:
        "two hooks in file order: post-edit (format), then post-tool (log)",
      note: "The one fan-out event: format the edit, then record the turn.",
    },
    {
      id: "fill",
      title: "rolling-log",
      kind: "module",
      tag: `FACT · ${SHORT_SHA}`,
      payload: "append one JSONL record · 0 tokens · fail-silent",
      note: "A plain file append. Not an LLM call.",
    },
    {
      id: "disk",
      title: "disk",
      kind: "disk",
      tag: "append-only",
      payload: '{"ts":"…","tool":"Write","ok":true,"file":"format-lint.mjs"}',
      note: "The append-only residue. The only node that grows.",
    },
    {
      id: "PreCompact",
      title: "PreCompact",
      kind: "router",
      tag: `FACT · ${SHORT_SHA} · ~8000 tokens`,
      payload: "summarize the whole transcript → narrative memory (paid, once)",
      note: "The one billed step: distill the log into cross-session memory.",
    },
  ];

function xAt(i: number): number {
  const m = 80;
  return m + (i * (W - 2 * m)) / (NODES.length - 1);
}

// The append-only residue, in the rolling-log's real JSONL shape. These accrete
// in the cylinder as the trace runs: the only node that grows.
export const DISK_RECORDS = [
  '{"ts":"…","tool":"Write","ok":true,"file":"format-lint.mjs"}',
  '{"ts":"…","tool":"Edit","ok":true,"file":"rolling-log.mjs"}',
  '{"ts":"…","tool":"Bash","ok":true,"cmd":"npm run verify"}',
];

export function buildSv3(): {
  model: DiagramModel;
  steps: Sv3Step[];
  nodes: NodeInfo[];
  diskRecords: string[];
  width: number;
  height: number;
} {
  const nodes: DiagramNode[] = NODES.map((n, i) => ({
    id: n.id,
    kind: n.kind,
    label: n.title,
    x: xAt(i),
    y: SPINE_Y,
    w:
      n.kind === "module"
        ? 120
        : n.kind === "tool"
          ? 92
          : n.kind === "disk"
            ? 84
            : 70,
    h:
      n.kind === "module"
        ? 46
        : n.kind === "tool"
          ? 32
          : n.kind === "disk"
            ? 70
            : 56,
    trust: n.id === "PreToolUse" ? "unpinnable" : "fact",
  }));

  // Forward spine: typed by what flows. LLM into reason, tool into the pill,
  // disk-write into the cylinder; the rest is event-payload.
  const fwdType = (to: string): DiagramEdge["type"] =>
    to === "reason"
      ? "llm"
      : to === "tool"
        ? "tool"
        : to === "disk"
          ? "disk"
          : "event";

  const edges: DiagramEdge[] = [];
  for (let i = 1; i < NODES.length; i++) {
    edges.push({
      id: `e${i}`,
      from: NODES[i - 1].id,
      to: NODES[i].id,
      type: fwdType(NODES[i].id),
    });
  }
  // The return wire: PreCompact's memory loops back to UserPromptSubmit (stdout-
  // context), drawn as the same continuous track below the spine.
  const ret: DiagramEdge = {
    id: "eR",
    from: "PreCompact",
    to: "UserPromptSubmit",
    type: "stdout",
    via: [
      [xAt(8), RETURN_Y],
      [xAt(1), RETURN_Y],
    ],
  };
  edges.push(ret);

  const model: DiagramModel = {
    id: "sv3",
    sha: SHORT_SHA,
    width: W,
    height: H,
    nodes,
    edges,
  };

  const path = (edgeId: string) => {
    const e = edges.find((x) => x.id === edgeId)!;
    return edgePath(model, e);
  };

  // The trail of nodes already reached at step i (inclusive).
  const trail = (i: number) => NODES.slice(0, i + 1).map((n) => n.id);

  // Ten steps: the nine nodes in order, then the loop-back beat.
  const steps: Sv3Step[] = [
    {
      litNodes: ["SessionStart"],
      litEdges: [],
      visited: ["SessionStart"],
      tokenX: xAt(0),
      tokenY: SPINE_Y,
      diskLines: 0,
      drawer: "SessionStart",
      narration: NODES[0].note,
    },
  ];
  for (let i = 1; i < NODES.length; i++) {
    steps.push({
      litNodes: [NODES[i].id],
      litEdges: [`e${i}`],
      visited: trail(i),
      tokenPath: path(`e${i}`),
      // The log accretes from the disk node onward: disk → 1, PreCompact → 2.
      diskLines: i < 7 ? 0 : i - 6,
      drawer: NODES[i].id,
      narration: NODES[i].note,
    });
  }
  // Loop-back: the token rides the return wire; session-memory primes the next turn.
  steps.push({
    litNodes: ["UserPromptSubmit"],
    litEdges: ["eR"],
    // The whole forward spine stays lit behind the return ride: the loop is closed.
    visited: NODES.map((n) => n.id),
    tokenPath: path("eR"),
    diskLines: 3,
    drawer: "return",
    narration:
      "Compaction writes memory, and the return wire feeds it into the next UserPromptSubmit. The loop closes.",
  });

  return {
    model,
    steps,
    nodes: NODES,
    diskRecords: DISK_RECORDS,
    width: W,
    height: H,
  };
}
