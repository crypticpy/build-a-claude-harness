// The frozen diagram grammar: the typed model every visualization consumes, the
// node taxonomy geometry, and the typed-edge metadata. Imported from .astro
// frontmatter (build time only), so d3-shape never reaches a client bundle.
import { line, curveCatmullRom } from "d3-shape";

// ── Node taxonomy. Shape carries meaning independent of color, so forced-colors
// (which strips fill to currentColor) keeps type legible. ───────────────────
export type NodeKind =
  | "router"
  | "dispatcher"
  | "module"
  | "disk"
  | "llm"
  | "tool";

// ── Typed edges: hue + dash + glyph, all three channels, so any one alone
// disambiguates (deuteranopia, grayscale, forced-colors all survive). ────────
export type EdgeType = "event" | "stdout" | "disk" | "llm" | "tool";

export interface EdgeMeta {
  label: string;
  colorVar: string;
  dash: string; // stroke-dasharray; '0' = solid
  glyph: string;
}

export const EDGE_META: Record<EdgeType, EdgeMeta> = {
  event: {
    label: "event-payload",
    colorVar: "--edge-event",
    dash: "0",
    glyph: "▸",
  },
  stdout: {
    label: "stdout-context",
    colorVar: "--edge-stdout",
    dash: "8 3",
    glyph: "▹",
  },
  disk: {
    label: "disk-write",
    colorVar: "--edge-disk",
    dash: "1 4",
    glyph: "▢",
  },
  llm: {
    label: "LLM-call",
    colorVar: "--edge-llm",
    dash: "6 3 2 3",
    glyph: "⬡",
  },
  tool: {
    label: "tool-call",
    colorVar: "--edge-tool",
    dash: "3 2",
    glyph: "▭",
  },
};

export const NODE_LABEL: Record<NodeKind, string> = {
  router: "router (diamond)",
  dispatcher: "dispatcher (hub)",
  module: "module (rounded-rect)",
  disk: "disk (cylinder)",
  llm: "LLM (hexagon)",
  tool: "tool (pill)",
};

export interface DiagramNode {
  id: string;
  kind: NodeKind;
  label: string;
  x: number;
  y: number;
  w?: number;
  h?: number;
  /** real-at-SHA, platform-unpinnable, or course-taught simulation */
  trust?: "fact" | "unpinnable" | "sim";
}

export interface DiagramEdge {
  id: string;
  from: string;
  to: string;
  type: EdgeType;
  /** optional explicit waypoints; otherwise a straight line between node centers */
  via?: Array<[number, number]>;
}

export interface TraceStep {
  index: number;
  edgeId?: string;
  litNodeId?: string;
  narration: string;
  /** the real artifact string shown in the inspector at this step */
  payload?: string;
  /** a JSONL line that accretes into a disk cylinder on this step */
  accretes?: string;
}

export interface DiagramModel {
  id: string;
  sha?: string;
  width: number;
  height: number;
  nodes: DiagramNode[];
  edges: DiagramEdge[];
  steps?: TraceStep[];
}

// ── Deterministic corner jitter: Excalidraw warmth without runtime randomness.
// A tiny seeded PRNG keyed on the node id + vertex index. ─────────────────────
function hash(str: string): number {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0) / 4294967295;
}
function jit(seed: string, i: number, amp = 1.8): number {
  return (hash(`${seed}:${i}`) - 0.5) * 2 * amp;
}

const def = (n: DiagramNode) => ({
  w: n.w ?? (n.kind === "tool" ? 88 : n.kind === "module" ? 132 : 64),
  h: n.h ?? (n.kind === "tool" ? 30 : n.kind === "module" ? 48 : 56),
});

/** SVG path 'd' for a node's outline, with seeded corner jitter on the polygons. */
export function nodePath(n: DiagramNode): {
  tag: "path" | "rect";
  d?: string;
  rx?: number;
} {
  const { w, h } = def(n);
  const { x, y } = n;
  const J = (i: number) => jit(n.id, i);
  switch (n.kind) {
    case "router": {
      // diamond
      const top: [number, number] = [x + J(0), y - h / 2 + J(1)];
      const right: [number, number] = [x + w / 2 + J(2), y + J(3)];
      const bot: [number, number] = [x + J(4), y + h / 2 + J(5)];
      const left: [number, number] = [x - w / 2 + J(6), y + J(7)];
      return { tag: "path", d: `M${top} L${right} L${bot} L${left} Z` };
    }
    case "llm": {
      // hexagon (flat-top)
      const r = w / 2;
      const pts: Array<[number, number]> = [];
      for (let i = 0; i < 6; i++) {
        const a = (Math.PI / 3) * i - Math.PI / 6;
        pts.push([
          x + Math.cos(a) * r + J(i),
          y + Math.sin(a) * (h / 2) + J(i + 6),
        ]);
      }
      return { tag: "path", d: `M${pts.map((p) => p.join(",")).join(" L")} Z` };
    }
    case "tool":
      return { tag: "rect", rx: h / 2 };
    case "module":
      return { tag: "rect", rx: 6 };
    case "dispatcher":
      return { tag: "rect", rx: 8 };
    case "disk": {
      // cylinder: top ellipse + sides + bottom ellipse
      const rx = w / 2;
      const ry = Math.min(10, h / 5);
      const top = y - h / 2;
      const bot = y + h / 2;
      const d = [
        `M${x - rx},${top}`,
        `a${rx},${ry} 0 0 0 ${rx * 2},0`,
        `a${rx},${ry} 0 0 0 ${-rx * 2},0`,
        `v${bot - top}`,
        `a${rx},${ry} 0 0 0 ${rx * 2},0`,
        `v${-(bot - top)}`,
      ].join(" ");
      return { tag: "path", d };
    }
    default:
      return { tag: "rect", rx: 4 };
  }
}

/** Bounding rect for a node (for <rect> kinds and focus-rects). */
export function nodeRect(n: DiagramNode): {
  x: number;
  y: number;
  w: number;
  h: number;
} {
  const { w, h } = def(n);
  return { x: n.x - w / 2, y: n.y - h / 2, w, h };
}

/** Smooth edge path between two nodes (build-time d3-shape, zero runtime d3). */
export function edgePath(model: DiagramModel, edge: DiagramEdge): string {
  const from = model.nodes.find((n) => n.id === edge.from);
  const to = model.nodes.find((n) => n.id === edge.to);
  if (!from || !to) return "";
  const pts: Array<[number, number]> = [
    [from.x, from.y],
    ...(edge.via ?? []),
    [to.x, to.y],
  ];
  const gen = line()
    .x((p) => p[0])
    .y((p) => p[1])
    .curve(curveCatmullRom.alpha(0.5));
  return gen(pts) ?? "";
}

/** Midpoint of an edge, for placing the type glyph. */
export function edgeMid(
  model: DiagramModel,
  edge: DiagramEdge,
): [number, number] {
  const from = model.nodes.find((n) => n.id === edge.from);
  const to = model.nodes.find((n) => n.id === edge.to);
  if (!from || !to) return [0, 0];
  const via = edge.via?.[Math.floor((edge.via.length - 1) / 2)];
  if (via) return via;
  return [(from.x + to.x) / 2, (from.y + to.y) / 2];
}
