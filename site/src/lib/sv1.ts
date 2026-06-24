// SV-1 Lifecycle Timeline — the hero. Build-time only: turns the generated
// StationModel[] into ONE typed DiagramModel plus the step-script and drawer
// data. The same source feeds three renders (animated SVG, data twin, no-JS
// fallback). No d3/runtime here beyond the frozen kit.
//
// The motion is the lesson: one amber token ignites at SessionStart and RIDES
// the wire from station to station (CSS offset-path, driven by the shared
// TracePlayer). At PostToolUse it splits into two capsules that ride two
// sub-wires into two module glyphs, because that one event genuinely fans out
// to two hooks. "An event is not a wire, it is a bus."
import models from "../generated/models.json";
import {
  type DiagramModel,
  type DiagramNode,
  type DiagramEdge,
} from "./diagram";

export interface Matcher {
  matcher: string;
  command: string;
  arg: string;
}
export interface Station {
  id: string;
  subscribed: boolean;
  fanout: boolean;
  matchers: Matcher[];
  contract: { stdin: string; stdout: string } | null;
  note: string;
  narration: string;
  provenance: { sha: string; permalink: string } | null;
}

export interface StepView {
  litNodes: string[];
  litEdges: string[];
  tokenX: number;
  tokenY: number;
  tokenPath?: string;
  fanout?: { paths: string[] };
  drawer: string;
  narration: string;
}

const WIRE_Y = 150;
const MARGIN = 90;
const WIDTH = 980;
const HEIGHT = 430;
const FAN_DROP = 150; // vertical drop from the wire to the fan-out modules
const FAN_SPREAD = 120; // horizontal spread of the two module glyphs

export const stations = models.stations as Station[];

function xFor(i: number, n: number): number {
  if (n <= 1) return WIDTH / 2;
  return MARGIN + (i * (WIDTH - 2 * MARGIN)) / (n - 1);
}

export interface FanModule {
  node: DiagramNode;
  wireD: string; // sub-wire from the fan-out station down to this module
}

export function buildSv1(): {
  model: DiagramModel;
  steps: StepView[];
  wireY: number;
  wireD: string;
  fanModules: FanModule[];
} {
  const n = stations.length;
  const nodes: DiagramNode[] = stations.map((s, i) => ({
    id: s.id,
    kind: "router",
    label: s.id,
    x: xFor(i, n),
    y: WIRE_Y,
    w: 70,
    h: 56,
    trust: s.subscribed ? "fact" : "unpinnable",
  }));

  // Event-payload segments between consecutive stations: the platform handing
  // the turn forward. The inbound segment lights as the token arrives.
  const edges: DiagramEdge[] = [];
  for (let i = 1; i < n; i++) {
    edges.push({
      id: `seg-${i}`,
      from: stations[i - 1].id,
      to: stations[i].id,
      type: "event",
    });
  }

  // ── The fan-out: PostToolUse is the one event that calls more than one hook.
  // Build a module glyph for each matcher and a sub-wire the capsule rides. ──
  const fanIdx = stations.findIndex((s) => s.fanout);
  const fanModules: FanModule[] = [];
  if (fanIdx >= 0) {
    const fx = xFor(fanIdx, n);
    const fy = WIRE_Y;
    const ms = stations[fanIdx].matchers;
    const modY = fy + FAN_DROP;
    ms.forEach((m, k) => {
      const offset =
        ms.length === 1 ? 0 : (k - (ms.length - 1) / 2) * FAN_SPREAD;
      const mx = fx + offset;
      const id = `fan-${fanIdx}-${k}`;
      nodes.push({
        id,
        kind: "module",
        label: m.arg,
        x: mx,
        y: modY,
        w: 116,
        h: 44,
        trust: "fact",
      });
      edges.push({
        id: `fanseg-${k}`,
        from: stations[fanIdx].id,
        to: id,
        type: "event",
      });
      // sub-wire from just under the diamond to the module's top edge
      fanModules.push({
        node: nodes[nodes.length - 1],
        wireD: `M${fx},${fy + 28} L${mx},${modY - 22}`,
      });
    });
  }

  const model: DiagramModel = {
    id: "sv1",
    sha: (models as { shortSha?: string }).shortSha,
    width: WIDTH,
    height: HEIGHT,
    nodes,
    edges,
  };

  const steps: StepView[] = stations.map((s, i) => {
    const visited = stations.slice(0, i + 1).map((st) => st.id);
    const isFan = s.fanout && fanModules.length > 0;
    return {
      litNodes: isFan ? [s.id, ...fanModules.map((f) => f.node.id)] : [s.id],
      litEdges: [
        ...(i > 0 ? [`seg-${i}`] : []),
        ...(isFan ? fanModules.map((_, k) => `fanseg-${k}`) : []),
      ],
      visited,
      tokenX: xFor(i, n),
      tokenY: WIRE_Y,
      // Ride the inbound segment of the wire into this station.
      tokenPath:
        i > 0 ? `M${xFor(i - 1, n)},${WIRE_Y} H${xFor(i, n)}` : undefined,
      fanout: isFan ? { paths: fanModules.map((f) => f.wireD) } : undefined,
      drawer: s.id,
      narration: s.narration,
    } as StepView & { visited: string[] };
  });

  const first = xFor(0, n);
  const last = xFor(n - 1, n);
  const wireD = `M${first},${WIRE_Y} H${last}`;

  return { model, steps, wireY: WIRE_Y, wireD, fanModules };
}
